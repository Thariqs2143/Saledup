
'use strict';

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { differenceInMinutes, parse } from 'date-fns';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * A scheduled function that runs every 15 minutes to send shift start reminders.
 */
export const scheduledShiftReminder = functions.pubsub.schedule('every 15 minutes').onRun(async (context) => {
    console.log('Running scheduledShiftReminder function.');

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    try {
        const shopsSnapshot = await db.collection('shops').get();
        if (shopsSnapshot.empty) {
            console.log('No shops found.');
            return;
        }

        for (const shopDoc of shopsSnapshot.docs) {
            const shopId = shopDoc.id;
            const shopData = shopDoc.data();
            
            const settingsDoc = await db.collection('shops').doc(shopId).collection('config').doc('main').get();
            if (!settingsDoc.exists || !settingsDoc.data()?.enableEmployeeReminders) {
                console.log(`Reminders disabled for shop ${shopId}. Skipping.`);
                continue;
            }

            const daySettings = shopData.businessHours?.[currentDay];
            if (!daySettings || !daySettings.isOpen) {
                continue; // Shop is closed today
            }

            const shiftStartTime = parse(daySettings.startTime, 'HH:mm', new Date());
            const minutesUntilShift = differenceInMinutes(shiftStartTime, now);
            
            // Send reminder if shift is 0-15 minutes away
            if (minutesUntilShift >= 0 && minutesUntilShift <= 15) {
                console.log(`Shop ${shopId} has a shift starting soon.`);
                const employeesSnapshot = await db.collection('shops').doc(shopId).collection('employees')
                    .where('status', '==', 'Active')
                    .get();

                if (employeesSnapshot.empty) continue;

                for (const empDoc of employeesSnapshot.docs) {
                    const employee = empDoc.data();
                    if (employee.fcmToken) {
                        const payload: admin.messaging.MessagingPayload = {
                            notification: {
                                title: 'Shift Reminder',
                                body: `Hi ${employee.name}, your shift at ${shopData.shopName} is starting soon at ${daySettings.startTime}. Don't forget to check in!`,
                                icon: '/favicon.ico', // Optional: link to your app's icon
                            },
                        };
                        console.log(`Sending reminder to ${employee.name} (Token: ${employee.fcmToken})`);
                        await messaging.sendToDevice(employee.fcmToken, payload);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in scheduledShiftReminder:', error);
    }
});


/**
 * A scheduled function that runs every 30 minutes to check for late or absent employees.
 */
export const scheduledLateCheckAlert = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
    console.log('Running scheduledLateCheckAlert function.');

    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const todayStartTimestamp = Timestamp.fromDate(todayStart);
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    try {
        const shopsSnapshot = await db.collection('shops').get();
        if (shopsSnapshot.empty) return;

        for (const shopDoc of shopsSnapshot.docs) {
            const shopId = shopDoc.id;
            const settingsDoc = await db.collection('shops').doc(shopId).collection('config').doc('main').get();
            const settingsData = settingsDoc.data();

            if (!settingsDoc.exists || !settingsData?.enableLateAlerts) {
                 console.log(`Late alerts disabled for shop ${shopId}. Skipping.`);
                continue;
            }

            const daySettings = settingsData.businessHours?.[currentDay];
            if (!daySettings || !daySettings.isOpen) {
                continue;
            }

            const shiftStartTime = parse(daySettings.startTime, 'HH:mm', new Date());
            const gracePeriod = settingsData.lateGracePeriodMinutes || 0;
            const lateDeadline = new Date(shiftStartTime.getTime() + gracePeriod * 60000);

            if (now > lateDeadline) { // Only check for late employees if the current time is past the deadline
                 const employeesSnapshot = await db.collection('shops').doc(shopId).collection('employees')
                    .where('status', '==', 'Active')
                    .get();
                
                if (employeesSnapshot.empty) continue;
                
                const adminUserDoc = await db.collection('users').doc(shopId).get();
                const adminFcmToken = adminUserDoc.exists ? adminUserDoc.data()?.fcmToken : null;
                if (!adminFcmToken) {
                    console.log(`Admin for shop ${shopId} does not have an FCM token. Cannot send alert.`);
                    continue;
                }

                for (const empDoc of employeesSnapshot.docs) {
                    const employee = empDoc.data();
                    const attendanceQuery = await db.collection('shops').doc(shopId).collection('attendance')
                        .where('userId', '==', empDoc.id)
                        .where('checkInTime', '>=', todayStartTimestamp)
                        .limit(1)
                        .get();

                    if (attendanceQuery.empty) {
                        // No check-in record for today, this employee is late/absent.
                         const payload: admin.messaging.MessagingPayload = {
                            notification: {
                                title: 'Employee Late Alert',
                                body: `${employee.name} has not checked in for their ${daySettings.startTime} shift yet.`,
                            },
                        };
                        console.log(`Sending LATE alert for ${employee.name} to admin of shop ${shopId}`);
                        await messaging.sendToDevice(adminFcmToken, payload);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in scheduledLateCheckAlert:', error);
    }
});


/**
 * Verifies a Razorpay subscription payment and updates the user's plan in Firestore.
 */
export const verifyRazorpaySubscription = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, shopId, planName } = data;
    
    // Validate required data
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !shopId || !planName) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required payment information.');
    }
    
    // Ensure the user is updating their own shop
    if (context.auth.uid !== shopId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only update your own shop.');
    }
    
    const secret = functions.config().razorpay.key_secret;
    if (!secret) {
        throw new functions.https.HttpsError('internal', 'Razorpay secret key is not configured.');
    }

    const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
        throw new functions.https.HttpsError('unauthenticated', 'Request signature verification failed.');
    }
    
    // Signature is valid, update the database
    try {
        const shopDocRef = db.collection('shops').doc(shopId);
        await shopDocRef.update({
            subscriptionPlan: planName,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySubscriptionId: razorpay_subscription_id,
            subscriptionStatus: 'active',
            updatedAt: Timestamp.now(),
        });
        
        return { success: true, message: `Subscription successfully updated to ${planName}.` };

    } catch (error) {
        console.error("Error updating Firestore:", error);
        throw new functions.https_HttpsError('internal', 'Failed to update subscription in the database.');
    }
});

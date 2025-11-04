// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// "Default" Firebase app is used in this case
const firebaseConfig = {
  apiKey: "AIzaSyAlT5TM_hgz7UXYlOfPkmiaB_mgO_2qJHA",
  authDomain: "attendeasy-jqymi.firebaseapp.com",
  projectId: "attendeasy-jqymi",
  storageBucket: "attendeasy-jqymi.appspot.com",
  messagingSenderId: "245656476733",
  appId: "1:245656476733:web:68aa04498f30b52af0de54"
};

firebase.initializeApp(firebaseConfig);


// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});

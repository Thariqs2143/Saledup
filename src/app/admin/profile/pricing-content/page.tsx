
'use client';

import PricingPageContent from '../pricing-content';

// This is a new page component that wraps the existing pricing content.
// This makes it a valid route at /admin/profile/pricing-content
export default function PricingPage() {
    return <PricingPageContent />;
}

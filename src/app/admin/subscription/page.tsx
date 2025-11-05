'use client';

import React, { useState } from 'react';

export default function PricingPlans() {
  const [isYearly, setIsYearly] = useState(false);

  const features = [
    'QR Code Check-in/out (permanent & dynamic)',
    'Manual Attendance Entry',
    'Live Attendance Dashboard',
    'Multi-Branch Support',
    'Employee Profiles',
    'Easy Employee Onboarding (phone number invite)',
    'Staff Transfer Between Branches',
    'Detailed Attendance Reports (daily/weekly/monthly)',
    'Muster Roll Generation',
    'Automated Payroll Calculation',
    'Export Reports (PDF / Excel)',
    'Points & Rewards System',
    'Punctuality Leaderboard',
    'Achievement Badges',
    'AI-Powered Weekly Briefing',
    'Smart Staffing Advisor (AI)',
    'Customizable Alerts & Notifications'
  ];

  const plans = [
    {
      id: 'trial',
      name: 'Free Trial',
      monthly: 0,
      yearly: 0,
      note: '/14 days',
      cta: 'Start Free Trial',
      employees: 'Full access (14 days)',
      branches: 'All features unlocked',
      included: new Set(features),
      highlight: 'Try everything for 14 days',
      accent: 'from-indigo-500 to-blue-500'
    },
    {
      id: 'pro',
      name: 'Pro',
      monthly: 499,
      yearly: 4990,
      note: '',
      cta: 'Upgrade Now',
      employees: 'Up to 100 employees',
      branches: 'Up to 5 branches',
      included: new Set(features.filter((_, i) => i < features.length - 1)),
      highlight: 'Most popular for SMBs',
      accent: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthly: null,
      yearly: null,
      note: '',
      cta: 'Contact Sales',
      employees: 'Unlimited employees',
      branches: 'Unlimited branches',
      included: new Set(features),
      highlight: 'For large multi-branch organizations',
      accent: 'from-emerald-500 to-teal-500'
    }
  ];

  const Check = ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4.5 10.5L8.2 14.2L15.5 6.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const XMark = ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-background">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Simple, Transparent Pricing</h2>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">Start free, explore every feature, and upgrade when you’re ready.</p>
        <div className="mt-6 flex justify-center items-center gap-3">
          <span className={`text-sm font-medium ${!isYearly ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>Monthly</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isYearly} onChange={() => setIsYearly(!isYearly)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
          <span className={`text-sm font-medium ${isYearly ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>Yearly <span className="text-green-600 dark:text-green-400 font-semibold">(Save 15%)</span></span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 mb-14">
        {plans.map((p) => (
          <div key={p.id} className={`relative rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:shadow-xl transition-transform hover:-translate-y-1`}>
            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r ${p.accent}`}></div>
            <div className="p-8 flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.highlight}</p>
                </div>
                {p.id === 'pro' && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">Popular</span>
                )}
              </div>

              <div className="mb-6">
                {p.monthly === null ? (
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">Custom</span>
                ) : (
                  <>
                    <div className="flex items-baseline gap-x-2">
                      <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">₹{isYearly ? p.yearly : p.monthly}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{p.id === 'trial' ? p.note : isYearly ? '/year' : '/month'}</span>
                    </div>
                    {p.id === 'pro' && isYearly && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">You save ₹998 per year!</p>
                    )}
                  </>
                )}
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{p.employees} • {p.branches}</div>
              </div>

              <ul className="space-y-3 mb-8">
                {features.slice(0, 6).map((f) => (
                  <li key={f} className="flex items-start gap-x-3 text-sm">
                    {p.included.has(f) ? (
                      <Check className="text-emerald-500 w-5 h-5 mt-0.5" />
                    ) : (
                      <XMark className="text-gray-300 dark:text-gray-600 w-5 h-5 mt-0.5" />
                    )}
                    <span className={`${p.included.has(f) ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${p.accent} hover:opacity-90 transition-all shadow-md`}>{p.cta}</button>

              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">Support: {p.id === 'trial' ? 'Email only' : p.id === 'pro' ? 'Priority email & chat' : 'Dedicated account manager'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800 dark:text-gray-200">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="px-6 py-3 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {features.map((f) => (
              <tr key={f} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition">
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 w-64">{f}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-6 py-4 text-center">
                    {p.included.has(f) ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"><Check className="w-4 h-4" /></span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-600"><XMark className="w-4 h-4" /></span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Need a custom quote or on-premise version? <a href="#contact" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Contact our team</a> — we’ll tailor it for your business.</p>
      </div>
    </div>
  );
}

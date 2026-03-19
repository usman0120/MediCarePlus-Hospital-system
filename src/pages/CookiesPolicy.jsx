import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCookieBite,
  faInfoCircle,
  faShieldAlt,
  faSlidersH,
  faChartLine,
  faUserCog,
} from '@fortawesome/free-solid-svg-icons';

const CookiesPolicy = () => {
  const lastUpdated = 'January 1, 2024';

  const cookieTypes = [
    {
      icon: faCookieBite,
      name: 'Essential Cookies',
      description: 'Required for the website to function properly. These cannot be disabled.',
      examples: ['Authentication cookies', 'Security cookies', 'Session management'],
      required: true
    },
    {
      icon: faChartLine,
      name: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website.',
      examples: ['Google Analytics', 'Page visit statistics', 'User behavior data'],
      required: false
    },
    {
      icon: faUserCog,
      name: 'Functional Cookies',
      description: 'Remember your preferences and enhance your experience.',
      examples: ['Language preferences', 'Theme selection', 'Saved settings'],
      required: false
    },
    {
      icon: faSlidersH,
      name: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements and track campaign performance.',
      examples: ['Ad personalization', 'Social media integration', 'Retargeting'],
      required: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faCookieBite} className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookies Policy</h1>
          <p className="text-xl">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {/* Introduction */}
              <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 p-4 mb-8">
                <p className="text-blue-800 dark:text-blue-200 flex items-start">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2 mt-1 flex-shrink-0" />
                  <span>
                    This Cookies Policy explains how MediCare Plus Hospital uses cookies and similar technologies to recognize you when you visit our website. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
                  </span>
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-3 text-blue-600" />
                What Are Cookies?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners. Cookies help us enhance your browsing experience, remember your preferences, and understand how you use our site.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faShieldAlt} className="mr-3 text-blue-600" />
                Types of Cookies We Use
              </h2>
              
              <div className="space-y-6 mb-8">
                {cookieTypes.map((cookie, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <FontAwesomeIcon icon={cookie.icon} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {cookie.name}
                          </h3>
                          {cookie.required ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                              Required
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          {cookie.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {cookie.examples.map((example, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                            >
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How We Use Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">We use cookies for the following purposes:</p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li><strong className="text-gray-900 dark:text-white">Authentication:</strong> To keep you logged in and remember your session</li>
                <li><strong className="text-gray-900 dark:text-white">Security:</strong> To protect your account and detect suspicious activity</li>
                <li><strong className="text-gray-900 dark:text-white">Preferences:</strong> To remember your settings and preferences</li>
                <li><strong className="text-gray-900 dark:text-white">Analytics:</strong> To understand how visitors use our website</li>
                <li><strong className="text-gray-900 dark:text-white">Performance:</strong> To improve website speed and functionality</li>
                <li><strong className="text-gray-900 dark:text-white">Marketing:</strong> To show relevant advertisements (with your consent)</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Third-Party Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the service and deliver advertisements on and through the service. These include:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li><strong>Google Analytics:</strong> To analyze website traffic and user behavior</li>
                <li><strong>Facebook Pixel:</strong> For social media integration and advertising</li>
                <li><strong>Hotjar:</strong> To understand user experience and improve our website</li>
                <li><strong>YouTube:</strong> For embedded video content</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Cookie Choices</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li><strong>Browser Settings:</strong> Most web browsers allow you to manage cookies through their settings. You can block or delete cookies, but this may affect website functionality.</li>
                <li><strong>Cookie Banner:</strong> When you first visit our site, you can accept or reject non-essential cookies through our cookie consent banner.</li>
                <li><strong>Opt-Out Tools:</strong> You can opt out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on.</li>
              </ul>

              <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 p-4 mb-6">
                <p className="text-yellow-800 dark:text-yellow-200 flex items-start">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2 mt-1 flex-shrink-0" />
                  <span>
                    <strong>Note:</strong> Blocking essential cookies may impact your experience on our website and limit access to certain features, including appointment booking and patient portal access.
                  </span>
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How to Control Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You can control and manage cookies in various ways. Please note that removing or blocking cookies can impact your user experience and parts of our website may no longer be fully accessible.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Google Chrome</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Settings → Privacy and Security → Cookies and other site data
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Mozilla Firefox</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Options → Privacy & Security → Cookies and Site Data
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Safari</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Preferences → Privacy → Cookies and website data
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Microsoft Edge</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Settings → Site permissions → Cookies and site data
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Updates to This Policy</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We may update this Cookies Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                If you have questions about our use of cookies, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <strong>Privacy Officer</strong><br />
                  MediCare Plus Hospital<br />
                  123 Healthcare Avenue, Medical District<br />
                  New York, NY 10001
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Email: privacy@medicareplus.com<br />
                  Phone: +1 (234) 567-892
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By continuing to use our website, you consent to our use of cookies in accordance with this Cookies Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Settings Preview */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Cookie Preferences</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You can customize your cookie preferences below. Essential cookies cannot be disabled as they are necessary for the website to function.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Essential Cookies</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Required for basic website functionality</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">
                  Always Active
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Analytics Cookies</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Help us improve our website</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Functional Cookies</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Remember your preferences</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Marketing Cookies</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Personalize advertisements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CookiesPolicy;
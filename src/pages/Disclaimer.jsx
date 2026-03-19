import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faGavel,
  faInfoCircle,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

const Disclaimer = () => {
  const lastUpdated = 'January 1, 2024';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Disclaimer</h1>
          <p className="text-xl">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {/* Important Warning */}
              <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-600 p-6 mb-8 rounded-lg">
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="h-8 w-8 text-red-600 dark:text-red-400 mr-4 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">IMPORTANT MEDICAL DISCLAIMER</h2>
                    <p className="text-red-700 dark:text-red-300">
                      This website is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faGavel} className="mr-3 text-orange-600" />
                General Disclaimer
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The information provided by MediCare Plus Hospital ("we," "us," or "our") on [website URL] (the "Site") is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-3 text-blue-600" />
                No Medical Advice
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The content on this website, including text, graphics, images, and information obtained from third parties, is for informational and educational purposes only and is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or treatment.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Never disregard professional medical advice or delay in seeking it because of something you have read on this website. If you think you may have a medical emergency, call your doctor or emergency services immediately.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FontAwesomeIcon icon={faShieldAlt} className="mr-3 text-green-600" />
                No Doctor-Patient Relationship
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your use of this website does not create a doctor-patient relationship between you and MediCare Plus Hospital or any of its physicians. The information provided on this website should not be used to diagnose or treat a health problem or disease. It is not a substitute for professional care.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">External Links Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties or links to websites and features in banners or other advertising. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We do not warrant, endorse, guarantee, or assume responsibility for the accuracy or reliability of any information offered by third-party websites linked through the site or any website or feature linked in any banner or other advertising. We will not be a party to or in any way be responsible for monitoring any transaction between you and third-party providers of products or services.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Testimonials Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The Site may contain testimonials by users of our products and/or services. These testimonials reflect the real-life experiences and opinions of such users. However, the experiences are personal to those particular users, and may not necessarily be representative of all users of our products and/or services. We do not claim, and you should not assume, that all users will have the same experiences.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The testimonials on the Site are submitted in various forms such as text, audio and/or video, and are reviewed by us before being posted. They appear on the Site verbatim as given by the users, except for the correction of grammar or typing errors. Some testimonials may have been shortened for the sake of brevity where the full testimonial contained extraneous information not relevant to the general public.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Errors and Omissions Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                While we have made every attempt to ensure that the information contained in this site has been obtained from reliable sources, MediCare Plus Hospital is not responsible for any errors or omissions or for the results obtained from the use of this information. All information in this site is provided "as is", with no guarantee of completeness, accuracy, timeliness or of the results obtained from the use of this information, and without warranty of any kind, express or implied, including, but not limited to warranties of performance, merchantability, and fitness for a particular purpose.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Fair Use Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The Site may contain copyrighted material, the use of which has not always been specifically authorized by the copyright owner. We are making such material available for criticism, comment, news reporting, teaching, scholarship, or research. We believe this constitutes a "fair use" of any such copyrighted material as provided for in section 107 of the US Copyright Law.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                If you wish to use copyrighted material from this site for purposes of your own that go beyond fair use, you must obtain permission from the copyright owner.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Views Expressed Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The Site may contain views and opinions which are those of the authors and do not necessarily reflect the official policy or position of any other author, agency, organization, employer or company, including MediCare Plus Hospital. Comments published on the Site are the sole responsibility of their authors and their accuracy, completeness, timeliness, and appropriateness are not guaranteed by us.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Responsibility Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The information on the Site is provided with the understanding that MediCare Plus Hospital and its authors are not herein engaged in rendering legal, accounting, tax, or other professional advice and services. As such, it should not be used as a substitute for consultation with professional accounting, tax, legal or other competent advisers.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                In no event shall MediCare Plus Hospital or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever arising out of or in connection with your access or use or inability to access or use the Site.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">"Use at Your Own Risk" Disclaimer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                All information in the Site is provided "as is", with no guarantee of completeness, accuracy, timeliness or of the results obtained from the use of this information, and without warranty of any kind, express or implied, including, but not limited to warranties of performance, merchantability, and fitness for a particular purpose.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We will not be liable to you or anyone else for any decision made or action taken in reliance on the information given by the Site or for any consequential, special or similar damages, even if advised of the possibility of such damages.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                If you have any questions about this Disclaimer, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <strong>Legal Department</strong><br />
                  MediCare Plus Hospital<br />
                  123 Healthcare Avenue, Medical District<br />
                  New York, NY 10001
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Email: legal@medicareplus.com<br />
                  Phone: +1 (234) 567-893
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By using our website, you hereby consent to our disclaimer and agree to its terms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Disclaimer;
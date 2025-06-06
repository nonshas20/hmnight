'use client';

import { useState } from 'react';

interface CameraTroubleshootingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CameraTroubleshootingGuide({ isOpen, onClose }: CameraTroubleshootingGuideProps) {
  const [activeTab, setActiveTab] = useState<'chrome' | 'firefox' | 'safari' | 'edge'>('chrome');

  if (!isOpen) return null;

  const troubleshootingSteps = {
    chrome: [
      'Click the camera icon in the address bar (left of the URL)',
      'Select "Always allow" for camera access',
      'Refresh the page',
      'If no camera icon appears, go to Settings > Privacy and security > Site Settings > Camera',
      'Find this website and change permission to "Allow"'
    ],
    firefox: [
      'Click the shield icon in the address bar',
      'Click "Turn off Tracking Protection for this site"',
      'Click the camera icon and select "Allow"',
      'Refresh the page',
      'Alternative: Go to Settings > Privacy & Security > Permissions > Camera'
    ],
    safari: [
      'Go to Safari > Settings > Websites > Camera',
      'Find this website and change to "Allow"',
      'Refresh the page',
      'On mobile: Settings > Safari > Camera > Allow'
    ],
    edge: [
      'Click the camera icon in the address bar',
      'Select "Allow" for camera access',
      'Refresh the page',
      'Alternative: Go to Settings > Site permissions > Camera'
    ]
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
        aria-label="Close modal"
        role="button"
        tabIndex={0}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-white/20">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Camera Troubleshooting</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Browser Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {Object.keys(troubleshootingSteps).map((browser) => (
                <button
                  key={browser}
                  onClick={() => setActiveTab(browser as any)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === browser
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {browser.charAt(0).toUpperCase() + browser.slice(1)}
                </button>
              ))}
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Steps for {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}:
              </h3>
              
              <ol className="space-y-3">
                {troubleshootingSteps[activeTab].map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Additional Tips */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Additional Tips:</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Make sure your camera is not being used by another application</li>
                <li>• Try using a different browser if the issue persists</li>
                <li>• On mobile devices, ensure the browser has camera permissions in system settings</li>
                <li>• Clear your browser cache and cookies for this site</li>
                <li>• Restart your browser and try again</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

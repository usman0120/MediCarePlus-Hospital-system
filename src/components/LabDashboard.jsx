import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlask,
  faClock,
  faHourglassHalf,
  faCheckCircle,
  faExclamationTriangle,
  faChartLine,
  faCalendarDay,
  faStopwatch
} from '@fortawesome/free-solid-svg-icons';
import { formatNumber } from '../utils/helpers';

const LabDashboard = ({ stats, urgentPending }) => {
  const cards = [
    {
      title: 'Total Requests',
      value: stats.total,
      icon: faFlask,
      color: 'blue',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: faClock,
      color: 'yellow',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: faHourglassHalf,
      color: 'blue',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Completed Today',
      value: stats.todayCompleted,
      icon: faCheckCircle,
      color: 'green',
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Urgent Tests',
      value: stats.urgent,
      icon: faExclamationTriangle,
      color: 'red',
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    },
    {
      title: 'Avg Processing',
      value: `${stats.avgProcessingTime}h`,
      icon: faStopwatch,
      color: 'purple',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Laboratory Dashboard</h2>
            <p className="text-teal-100 text-lg">Track and manage all lab test requests</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-teal-200 text-sm">Today's Date</p>
              <p className="text-xl font-semibold">{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-lg">
              <FontAwesomeIcon icon={faCalendarDay} className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`${card.bg} rounded-xl shadow-lg p-5 border ${card.border} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <FontAwesomeIcon icon={card.icon} className={`h-5 w-5 ${card.text}`} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.bg} ${card.text}`}>
                {card.title}
              </span>
            </div>
            <p className={`text-3xl font-bold ${card.text}`}>{formatNumber(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Priority Legend & Urgent Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Priority Legend */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="mr-2 text-teal-500" />
            Priority Triage System
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">🔴 Urgent</p>
                <p className="text-xs text-red-600 dark:text-red-300">Process immediately</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
              <div>
                <p className="font-semibold text-orange-700 dark:text-orange-400">🟡 High</p>
                <p className="text-xs text-orange-600 dark:text-orange-300">Process soon</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">🟢 Normal</p>
                <p className="text-xs text-green-600 dark:text-green-300">Routine processing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Urgent Alert */}
        {urgentPending > 0 && (
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-lg">
                <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Urgent Tests Pending!</h4>
                <p className="text-red-100 text-sm mb-2">
                  {urgentPending} urgent test(s) require immediate attention
                </p>
                <div className="flex space-x-2">
                  <span className="text-xs bg-white/30 px-2 py-1 rounded-full">
                    Priority: High
                  </span>
                  <span className="text-xs bg-white/30 px-2 py-1 rounded-full">
                    Action Required
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{stats.total}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tests</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Workload Distribution</h3>
        <div className="flex h-4 rounded-full overflow-hidden">
          {stats.total > 0 && (
            <>
              <div 
                className="bg-yellow-500 h-full" 
                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                title={`Pending: ${stats.pending}`}
              ></div>
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                title={`In Progress: ${stats.inProgress}`}
              ></div>
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                title={`Completed: ${stats.completed}`}
              ></div>
            </>
          )}
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            <span className="text-gray-600 dark:text-gray-400">Pending ({stats.pending})</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-gray-600 dark:text-gray-400">In Progress ({stats.inProgress})</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-600 dark:text-gray-400">Completed ({stats.completed})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabDashboard;
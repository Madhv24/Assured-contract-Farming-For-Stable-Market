import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, Users, Building2, ArrowRight, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  const { user, logout } = useAuth();

  const features = [
    {
      icon: <Leaf className="w-8 h-8 text-primary-600" />,
      title: 'Land Management',
      description: 'Efficiently manage your agricultural land and connect with qualified farmers.'
    },
    {
      icon: <Users className="w-8 h-8 text-primary-600" />,
      title: 'Farmer Network',
      description: 'Access a network of experienced farmers and agricultural companies.'
    },
    {
      icon: <Building2 className="w-8 h-8 text-primary-600" />,
      title: 'Market Access',
      description: 'Connect directly with buyers and secure stable market opportunities.'
    }
  ];

  const benefits = [
    'Secure contract farming agreements',
    'Transparent pricing and terms',
    'Quality assurance and monitoring',
    'Risk mitigation strategies',
    'Access to modern farming techniques',
    'Stable income for all stakeholders'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Leaf className="w-8 h-8 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">ContractFarming</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700">Welcome, {user.email}</span>
                  <Link
                    to="/dashboard"
                    className="btn-primary"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="btn-outline"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-outline">
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Assured Contract Farming for
            <span className="text-primary-600"> Stable Market</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect landowners, farmers, and buyers in a secure, transparent platform 
            that ensures stable income and quality agricultural production.
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                Start Your Journey
                <ArrowRight className="w-5 h-5 ml-2 inline" />
              </Link>
              <Link to="/login" className="btn-outline text-lg px-8 py-3">
                Already Have Account?
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Contract Farming?
          </h2>
          <p className="text-lg text-gray-600">
            Our platform provides comprehensive solutions for all agricultural stakeholders
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card text-center p-8">
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Benefits for All Stakeholders
            </h2>
            <p className="text-lg text-gray-600">
              Creating a win-win situation for everyone involved
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">For Landowners</h3>
              <ul className="space-y-2">
                {benefits.slice(0, 3).map((benefit, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <CheckCircle className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">For Farmers & Buyers</h3>
              <ul className="space-y-2">
                {benefits.slice(3).map((benefit, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <CheckCircle className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-primary-600 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Agricultural Business?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Join thousands of successful farmers, landowners, and buyers
            </p>
            <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200">
              Get Started Today
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Leaf className="w-8 h-8 text-primary-400 mr-2" />
              <span className="text-xl font-bold">ContractFarming</span>
            </div>
            <p className="text-gray-400 mb-4">
              Empowering agricultural communities through technology and transparency
            </p>
            <p className="text-gray-500 text-sm">
              © 2024 ContractFarming. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

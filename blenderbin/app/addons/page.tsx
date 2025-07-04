'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, User, Calendar, Tag, Package, ExternalLink } from 'lucide-react';
import { auth } from '../lib/firebase-client';
import { User as FirebaseUser } from 'firebase/auth';

interface AddonMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  blenderVersion: string;
  filename: string;
  size: number;
  lastModified: string;
  tier: 'free' | 'premium';
}

interface AddonsResponse {
  success: boolean;
  addons: AddonMetadata[];
  cached?: boolean;
  cacheAge?: number;
  count?: number;
  error?: string;
}

export default function AddonsPage() {
  const router = useRouter();
  const [addons, setAddons] = useState<AddonMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setUserLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/addons');
      const data: AddonsResponse = await response.json();

      if (data.success) {
        setAddons(data.addons);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch addons');
      }
    } catch (err) {
      setError('Network error while fetching addons');
      console.error('Error fetching addons:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filtering
  const categories = ['All', ...Array.from(new Set(addons.map(addon => addon.category)))];
  const tiers = ['All', 'Free', 'Premium'];

  // Filter addons by selected category and tier
  const filteredAddons = addons.filter(addon => {
    const categoryMatch = selectedCategory === 'All' || addon.category === selectedCategory;
    const tierMatch = selectedTier === 'All' || addon.tier === selectedTier.toLowerCase();
    return categoryMatch && tierMatch;
  });

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle download attempts
  const handleFreeDownload = async (addon: AddonMetadata) => {
    if (!user) {
      // Redirect to signup with return URL
      router.push(`/signup?from=${encodeURIComponent('/addons')}&action=download&addon=${encodeURIComponent(addon.filename)}`);
      return;
    }
    
    // User is authenticated, redirect to download page with auth token
    try {
      const idToken = await user.getIdToken();
      router.push(`/download?userId=${user.uid}&token=${encodeURIComponent(idToken)}&addon=${encodeURIComponent(addon.filename)}`);
    } catch (error) {
      console.error('Error getting auth token:', error);
      // Fallback to download page without token
      router.push(`/download?userId=${user.uid}&addon=${encodeURIComponent(addon.filename)}`);
    }
  };

  const handlePremiumDownload = (addon: AddonMetadata) => {
    if (!user) {
      // Redirect to signup with return URL
      router.push(`/signup?from=${encodeURIComponent('/addons')}&action=premium&addon=${encodeURIComponent(addon.filename)}`);
      return;
    }
    
    // User is authenticated, check subscription or redirect to pricing
    router.push(`/pricing/blenderbin?addon=${encodeURIComponent(addon.filename)}`);
  };

  if (loading) {
    return (
      <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black px-4 py-24">
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading add-ons...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black px-4 py-24">
      {/* Content container */}
      <div className="relative mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center mb-8">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl mb-6">
              BlenderBin
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Add-ons
              </span>
            </h1>
            <p className="text-lg leading-relaxed text-zinc-300 max-w-2xl mx-auto">
              Discover our curated collection of professional Blender add-ons. 
              Each tool is crafted to enhance your workflow and boost productivity.
            </p>
          </div>

          {/* Stats and Category Filter */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="text-zinc-400 text-center">
              {error ? (
                <span className="text-red-400">Error loading add-ons</span>
              ) : (
                <span>{filteredAddons.length} add-on{filteredAddons.length !== 1 ? 's' : ''} available</span>
              )}
            </div>
            
            {/* Tier Filter */}
            <div className="flex justify-center">
              <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-full border border-zinc-800/50">
                {tiers.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedTier === tier
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-3xl border border-red-800/50 bg-red-900/20 p-8 backdrop-blur-sm text-center mb-8">
            <h3 className="text-xl font-semibold text-red-300 mb-4">Unable to Load Add-ons</h3>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={fetchAddons}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Addons Grid */}
        {!error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAddons.map((addon, index) => (
              <div
                key={addon.filename}
                className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-6 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-800/30 hover:scale-[1.02] flex flex-col h-full"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Addon Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-white leading-tight">
                          {addon.name}
                        </h3>
                        {addon.tier === 'premium' && (
                          <span className="px-2 py-1 text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 rounded-full border border-yellow-500/30 font-medium">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30">
                          v{addon.version}
                        </span>
                        <span className="px-2 py-1 text-xs bg-zinc-700/50 text-zinc-300 rounded-full border border-zinc-600/30">
                          {addon.category}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border font-medium ${
                          addon.tier === 'free' 
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30' 
                            : 'bg-purple-600/20 text-purple-300 border-purple-600/30'
                        }`}>
                          {addon.tier === 'free' ? 'FREE' : 'PREMIUM'}
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      addon.tier === 'premium' 
                        ? 'bg-gradient-to-br from-purple-600/20 to-yellow-500/20' 
                        : 'bg-blue-600/20'
                    }`}>
                      <Package className={`h-5 w-5 ${
                        addon.tier === 'premium' ? 'text-yellow-400' : 'text-blue-400'
                      }`} />
                    </div>
                  </div>
                  
                  <p className="text-zinc-300 text-sm leading-relaxed mb-4 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {addon.description}
                  </p>
                </div>

                {/* Addon Metadata - This will grow to fill available space */}
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <User className="h-3 w-3" />
                    <span>by {addon.author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Tag className="h-3 w-3" />
                    <span>Blender {addon.blenderVersion}+</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    <span>Updated {formatDate(addon.lastModified)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Download className="h-3 w-3" />
                    <span>{formatFileSize(addon.size)}</span>
                  </div>
                </div>

                {/* Actions - This will always be at the bottom */}
                <div className="flex gap-3 mt-auto">
                  {addon.tier === 'free' ? (
                    <button 
                      onClick={() => handleFreeDownload(addon)}
                      className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {user ? 'Download Free' : 'Sign in to Download'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePremiumDownload(addon)}
                      className="flex-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 px-4 text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {user ? 'Subscribe to Download' : 'Sign in for Premium'}
                    </button>
                  )}
                  <button className="rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white p-2 transition-all duration-200 hover:scale-105">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && !loading && filteredAddons.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">No Add-ons Found</h3>
            <p className="text-zinc-400 mb-6">
              {selectedCategory === 'All' && selectedTier === 'All'
                ? 'No add-ons are currently available.' 
                : `No add-ons found matching your filters${selectedCategory !== 'All' ? ` in "${selectedCategory}"` : ''}${selectedTier !== 'All' ? ` for ${selectedTier} tier` : ''}.`
              }
            </p>
            {(selectedCategory !== 'All' || selectedTier !== 'All') && (
              <div className="flex gap-3 justify-center">
                {selectedCategory !== 'All' && (
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                  >
                    Clear Category Filter
                  </button>
                )}
                {selectedTier !== 'All' && (
                  <button
                    onClick={() => setSelectedTier('All')}
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                  >
                    Clear Tier Filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        {!error && filteredAddons.length > 0 && (
          <div className="mt-20 text-center">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm">
              <h3 className="text-2xl font-semibold text-white mb-4">Get Full Access</h3>
              <p className="text-zinc-300 mb-8 leading-relaxed">
                {user 
                  ? 'Subscribe to BlenderBin to download all add-ons and get access to new releases, updates, and exclusive tools.'
                  : 'Sign up for BlenderBin to access our complete library of professional Blender add-ons.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <Link 
                      href="/pricing/blenderbin"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Start Free Trial
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link 
                      href="/"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105 border border-zinc-700/50"
                    >
                      Learn More
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      href={`/signup?from=${encodeURIComponent('/addons')}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Sign Up Free
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link 
                      href="/pricing"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105 border border-zinc-700/50"
                    >
                      View Pricing
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
        </div>
      </div>
    </section>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Award, Package, Tag, Users, AlertCircle, Backpack, X, CheckCircle, Circle } from 'lucide-react';
import { TopNav } from '@/components/top-nav';
import { SettingsGuard } from '@/components/settings-guard';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  xpPrice: number;
  stockStatus: 'In stock' | 'No stock' | 'Will be restocked';
  category: 'Other' | 'Swag' | 'Item' | 'Event';
  limitPerPerson: number;
  relatedEvent?: {
    id: string;
    name: string;
    dayOfWeek: string;
    hour: string;
  } | null;
}

interface PurchasedItem {
  itemId: string;
  itemName: string;
  category?: string;
  xpPrice: number;
  purchasedAt: string;
  used: boolean;
  usedAt: string | null;
}

export default function StorePage() {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [userXP, setUserXP] = useState<number>(0);
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storeRes, userRes] = await Promise.all([
          fetch('/api/store'),
          fetch('/api/user/me')
        ]);

        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStoreItems(storeData.storeItems || []);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.authenticated && userData.user) {
            setUserXP(userData.user.xp || 0);
            setPurchasedItems(userData.user.purchasedItems || []);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && storeItems.length > 0) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.animation = 'pulse 2s ease-in-out';
        }
      }
    }
  }, [loading, storeItems]);

  const categories = ['All', 'Swag', 'Item', 'Event', 'Other'];
  
  const filteredItems = selectedCategory === 'All' 
    ? storeItems 
    : storeItems.filter(item => item.category === selectedCategory);

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'In stock':
        return 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10';
      case 'No stock':
        return 'text-red-400 border-red-500/20 bg-red-500/10';
      case 'Will be restocked':
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
      default:
        return 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Swag':
        return <Tag className="w-4 h-4" />;
      case 'Item':
        return <Package className="w-4 h-4" />;
      case 'Event':
        return <Users className="w-4 h-4" />;
      default:
        return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const canAfford = (price: number) => userXP >= price;
  
  const getItemPurchaseCount = (itemId: string) => {
    return purchasedItems.filter(item => item.itemId === itemId).length;
  };
  
  const isAtPurchaseLimit = (itemId: string, limit: number) => {
    if (limit === 0) return false;
    return getItemPurchaseCount(itemId) >= limit;
  };
  
  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId);
    
    try {
      const response = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUserXP(data.newXP);
        setPurchasedItems(prev => [...prev, data.purchase]);
        alert(data.message);
      } else {
        alert(data.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };
  
  const toggleItemUsage = async (itemId: string, purchaseIndex: number, markAsUsed: boolean) => {
    try {
      const updatedPurchases = [...purchasedItems];
      updatedPurchases[purchaseIndex] = {
        ...updatedPurchases[purchaseIndex],
        used: markAsUsed,
        usedAt: markAsUsed ? new Date().toISOString() : null
      };
      setPurchasedItems(updatedPurchases);
      
      const response = await fetch('/api/store/toggle-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemId, 
          purchaseIndex, 
          markAsUsed 
        }),
      });
      
      if (!response.ok) {
        setPurchasedItems(purchasedItems);
        alert('Failed to update item usage status');
      }
    } catch (error) {
      console.error('Error toggling item usage:', error);
      setPurchasedItems(purchasedItems);
      alert('Failed to update item usage status');
    }
  };

  return (
    <SettingsGuard requiredSetting="StoreEnabled">
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="store" />
        
        <div className="container mx-auto px-6 -mt-16">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 cursor-default">XP Store</h2>
                <p className="text-zinc-400 cursor-default">Exchange your experience points for rewards, swag or limited events!</p>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowInventory(true)}
                  className="flex items-center space-x-3 px-4 py-3 bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700/50 rounded-xl transition-all cursor-pointer"
                >
                  <Backpack className="w-5 h-5 text-[#7d82b8]" />
                  <div>
                    <p className="text-white font-semibold">Inventory</p>
                    <p className="text-zinc-400 text-xs text-left">& History</p>
                  </div>
                </button>
                <div className="flex items-center space-x-3 bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/50 px-4 py-3">
                  <Award className="w-5 h-5 text-[#7d82b8]" />
                  <div>
                    <p className="text-white font-semibold cursor-default">{userXP?.toLocaleString() || '0'} XP</p>
                    <p className="text-zinc-400 text-xs cursor-default">Available</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
                    selectedCategory === category
                      ? 'bg-[#7d82b8]/20 border-[#7d82b8]/30 text-[#7d82b8]'
                      : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-400 hover:border-zinc-600/50 hover:text-zinc-300'
                  }`}
                >
                  {getCategoryIcon(category)}
                  <span className="text-sm font-medium">{category}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 animate-pulse">
                  <div className="h-6 bg-zinc-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-zinc-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-zinc-700 rounded w-2/3 mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 bg-zinc-700 rounded w-20"></div>
                    <div className="h-8 bg-zinc-700 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} id={item.id} className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 hover:border-[#7d82b8]/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2 cursor-default">{item.name}</h3>
                      <p className="text-zinc-400 text-sm mb-3 line-clamp-2 cursor-default">{item.description}</p>
                    </div>
                    <div className="flex items-center space-x-1 ml-3 text-zinc-500">
                      {getCategoryIcon(item.category)}
                      <span className="text-xs cursor-default">{item.category}</span>
                    </div>
                  </div>

                  {item.stockStatus === 'In stock' ? (
                    <div className="text-xs text-zinc-500 mb-4 cursor-default">In stock</div>
                  ) : (
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium mb-4 ${getStockStatusColor(item.stockStatus)}`}>
                      <div className={`w-2 h-2 rounded-full cursor-default ${
                        item.stockStatus === 'No stock' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></div>
                      <span>{item.stockStatus}</span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {item.limitPerPerson > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-zinc-500">
                        <AlertCircle className="w-3 h-3" />
                        <span className="cursor-default">Limit: {item.limitPerPerson} per person</span>
                      </div>
                    )}
                    
                    {getItemPurchaseCount(item.id) > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-blue-400">
                        <Package className="w-3 h-3" />
                        <span className="cursor-default">You bought this {getItemPurchaseCount(item.id)} time{getItemPurchaseCount(item.id) > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-[#7d82b8]" />
                      <span className="text-lg font-semibold text-white cursor-default">{item.xpPrice?.toLocaleString()} XP</span>
                    </div>
                    
                    <button
                      onClick={() => handlePurchase(item.id)}
                      disabled={
                        purchasing === item.id ||
                        item.stockStatus === 'No stock' || 
                        !canAfford(item.xpPrice) ||
                        isAtPurchaseLimit(item.id, item.limitPerPerson)
                      }
                      className={`px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
                        purchasing === item.id
                          ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 cursor-not-allowed'
                          : item.stockStatus === 'No stock'
                          ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 cursor-not-allowed'
                          : !canAfford(item.xpPrice)
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed'
                          : isAtPurchaseLimit(item.id, item.limitPerPerson)
                          ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 cursor-not-allowed'
                          : 'bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border-[#7d82b8]/30 hover:border-[#7d82b8]/50 text-[#7d82b8] cursor-pointer'
                      }`}
                    >
                      {purchasing === item.id
                        ? 'Purchasing...'
                        : item.stockStatus === 'No stock' 
                        ? 'Out of Stock' 
                        : !canAfford(item.xpPrice)
                        ? 'Not enough XP :('
                        : isAtPurchaseLimit(item.id, item.limitPerPerson)
                        ? 'Limit Reached'
                        : 'Purchase'
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-white mb-2">No Items Available</h2>
                <p className="text-zinc-400">
                  {selectedCategory === 'All' 
                    ? 'The store is currently empty. Check back later!'
                    : `We haven&apos;t found anything in the ${selectedCategory} category yet... Our team went on a hike to find more items!`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showInventory && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowInventory(false)}
        >
          <div 
            className="bg-zinc-900/95 backdrop-blur-sm rounded-2xl border border-zinc-800/50 w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
              <div className="flex items-center space-x-3">
                <Backpack className="w-6 h-6 text-[#7d82b8]" />
                <div>
                  <h2 className="text-2xl font-bold text-white cursor-default">Your Inventory & History</h2>
                  <p className="text-zinc-400 text-sm cursor-default">The items you&apos;ve ever purchased and their current status in your inventory</p>
                </div>
              </div>
              <button
                onClick={() => setShowInventory(false)}
                className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {purchasedItems.length > 0 ? (
                <div className="space-y-4">
                  {purchasedItems.map((purchase, index) => {
                    const currentItem = storeItems.find(item => item.id === purchase.itemId);
                    const priceChanged = currentItem && currentItem.xpPrice !== purchase.xpPrice;
                    const actualCategory = currentItem?.category || purchase.category || 'Other';
                    const isEventItem = actualCategory === 'Event';
                    
                    return (
                      <div key={`${purchase.itemId}-${index}`} className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-white cursor-default">{purchase.itemName}</h3>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1 px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded-full text-xs cursor-default">
                                  {getCategoryIcon(actualCategory)}
                                  <span>{actualCategory}</span>
                                </div>
                                
                                {isEventItem ? (
                                  purchase.used ? (
                                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 text-xs">
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Event completed</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 text-xs cursor-default">
                                      <Circle className="w-3 h-3" />
                                      <span>Event pending</span>
                                    </div>
                                  )
                                ) : (
                                  purchase.used ? (
                                    <button
                                      onClick={() => toggleItemUsage(purchase.itemId, index, false)}
                                      className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 text-xs hover:bg-green-500/30 transition-all cursor-pointer"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Used</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toggleItemUsage(purchase.itemId, index, true)}
                                      className="flex items-center space-x-1 px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded-full border border-zinc-600/30 text-xs hover:bg-zinc-600/50 transition-all cursor-pointer"
                                    >
                                      <Circle className="w-3 h-3" />
                                      <span>Mark as used</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-zinc-500 mb-1 cursor-default">Purchased</p>
                                <p className="text-zinc-300 cursor-default">{new Date(purchase.purchasedAt).toLocaleDateString()}</p>
                              </div>
                              
                              <div>
                                <p className="text-zinc-500 mb-1 cursor-default">Price Paid</p>
                                <div className="flex items-center space-x-2 cursor-default">
                                  <span className="text-zinc-300">{purchase.xpPrice?.toLocaleString()} XP</span>
                                  {priceChanged && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-zinc-500">→</span>
                                      <span className="text-red-400 line-through text-xs">{currentItem?.xpPrice?.toLocaleString()} XP</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-zinc-500 mb-1 cursor-default">Category</p>
                                <p className="text-zinc-300 cursor-default">{purchase.category || 'Other'}</p>
                              </div>
                              
                              <div>
                                <p className="text-zinc-500 mb-1 cursor-default">Status</p>
                                <p className={`${purchase.used ? "text-green-400" : "text-zinc-300"} cursor-default`}>
                                  {isEventItem ? 
                                    (purchase.used ? 'Event completed' : 'Event pending') :
                                    (purchase.used ? `Used ${purchase.usedAt ? new Date(purchase.usedAt).toLocaleDateString() : ''}` : 'Not used')
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Backpack className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Items Yet</h3>
                  <p className="text-zinc-400">Purchase items from the store to see them here!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </SettingsGuard>
  );
}
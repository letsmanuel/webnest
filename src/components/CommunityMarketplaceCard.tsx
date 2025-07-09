import React from 'react';

interface CommunityMarketplaceCardProps {
  template: any;
  onBuy: () => void;
  onFavorite: () => void;
  onViewDetail: () => void;
  isFavorited: boolean;
  hideStock?: boolean;
}

export const CommunityMarketplaceCard: React.FC<CommunityMarketplaceCardProps> = ({
  template,
  onBuy,
  onFavorite,
  onViewDetail,
  isFavorited,
  hideStock = false
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 hover:shadow-lg transition cursor-pointer relative" onClick={onViewDetail}>
      <div className="flex items-center gap-2 mb-2">
        <img src={template.authorAvatar || '/placeholder.svg'} alt={template.authorName} className="w-8 h-8 rounded-full" />
        <span className="font-semibold text-sm text-gray-700">{template.authorName}</span>
      </div>
      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mb-2">
        {template.preview ? (
          <img src={template.preview} alt={template.name} className="object-cover w-full h-full" />
        ) : (
          <span className="text-gray-400">No Preview</span>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <div className="font-bold text-lg text-purple-700 truncate">{template.name}</div>
        <div className="text-xs text-gray-500 truncate">{template.description}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {template.tags && template.tags.map((tag: string) => (
            <span key={tag} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-pink-600">{template.price === 0 ? 'Free' : `${template.price} Tokens`}</span>
          {!hideStock && (
            <span className="text-xs text-gray-400">{template.stock === null ? '∞' : template.stock} in stock</span>
          )}
        </div>
        <button
          className="text-gray-400 hover:text-pink-500 z-10"
          onClick={e => { e.stopPropagation(); onFavorite(); }}
          title={isFavorited ? 'Unfavorite' : 'Favorite'}
        >
          {isFavorited ? '★' : '☆'}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">Sold: {template.soldCount || 0}</span>
        <button
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold hover:scale-105 transition z-10"
          onClick={e => { e.stopPropagation(); onBuy(); }}
        >
          {template.price === 0 ? 'Use' : 'Buy'}
        </button>
      </div>
    </div>
  );
}; 
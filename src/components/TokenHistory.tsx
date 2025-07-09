import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { userService, TokenTransaction } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface TokenHistoryProps {
  onBack: () => void;
}

export const TokenHistory = ({ onBack }: TokenHistoryProps) => {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      loadTransactionHistory();
    }
  }, [user]);

  const loadTransactionHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const history = await userService.getTokenHistory(user.uid, 50);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTransactionIcon = (type: 'earned' | 'spent' | 'refunded') => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'spent':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionColor = (type: 'earned' | 'spent' | 'refunded') => {
    switch (type) {
      case 'earned':
        return 'text-green-600 dark:text-green-400';
      case 'spent':
        return 'text-red-600 dark:text-red-400';
      case 'refunded':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getTransactionBadgeVariant = (type: 'earned' | 'spent' | 'refunded') => {
    switch (type) {
      case 'earned':
        return 'default' as const;
      case 'spent':
        return 'destructive' as const;
      case 'refunded':
        return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600 dark:text-gray-400">Lade Transaktionshistorie...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button onClick={onBack} variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Token Transaktionshistorie</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaktionsverlauf</span>
              <Button onClick={loadTransactionHistory} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Noch keine Transaktionen vorhanden
                </p>
                <p className="text-sm text-gray-400">
                  Hier werden alle Token-Transaktionen angezeigt, sobald du Websites erstellst oder löschst.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {transaction.reason}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </p>
                        {transaction.websiteId && (
                          <p className="text-xs text-gray-400">
                            Website ID: {transaction.websiteId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getTransactionBadgeVariant(transaction.type)}>
                        {transaction.type === 'earned' ? 'Earned' : 
                         transaction.type === 'spent' ? 'Spent' : 'Refunded'}
                      </Badge>
                      <span className={`font-bold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'spent' ? '-' : '+'}{transaction.amount} Tokens
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 
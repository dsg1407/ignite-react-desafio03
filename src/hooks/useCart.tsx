import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart'); //Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);
        if (cart[productIndex].amount + 1 > stockProduct.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const cartUpdated = cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount: product.amount + 1
            }
          } else {
            return product
          }
        })

        setCart(cartUpdated);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      } else {
        const product = await api.get<Product>(`/products/${productId}`).then(response => response.data);
        const newCart = [...cart, { ...product, amount: 1 }];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex < 0) throw Error;

      const newCart = cart.filter(product => product.id !== productId)

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) return;

      const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);
      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartUpdated = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount: amount
          }
        } else {
          return product
        }
      })

      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { isForOfStatement } from 'typescript';
import { api } from '../services/api';
import { Product } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) return JSON.parse(storagedCart);
    return [];
  });

  const getCurrentCart = (productId: Number) => cart.filter(({ id }) => id !== productId ) 

  const getProduct = (productId: number) => cart.find(({ id }) => id === productId)

  const addProduct = async (productId: number): Promise<void> => {
    try {
      const { data: stock } = await api.get(`/stock/${productId}`)
      const updatedCart = [...cart]
      const product = getProduct(productId)
      if(product && product.amount + 1 > stock.amount) throw new Error('invalidAmount')
      if(product) product.amount++
      else {
        const { data } = await api.get(`/products/${productId}`)
        const newProduct = {...data, amount: 1 }
        updatedCart.push(newProduct)
      }
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch (err) {
      if(err.message === 'invalidAmount') toast.error('Quantidade solicitada fora de estoque')
      else toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = getProduct(productId)
      if (!product) throw Error()
      const updatedCart = cart.filter(cartItem => cartItem.id !== productId)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const checkProductStock = async (product: Product, amount: number) => {
    const { data: stock } = await api.get(`/stock/${product.id}`)
    if(amount > stock.amount) throw new Error('invalidAmount')
  }

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return
      const updatedCart = [...cart]
      const product = updatedCart.find(product => product.id === productId)
      if (!product) throw new Error()
      await checkProductStock(product, amount)
      product.amount = amount
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch(err) {
      if(err.message === 'invalidAmount') toast.error('Quantidade solicitada fora de estoque')
      else toast.error('Erro na alteração de quantidade do produto')
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

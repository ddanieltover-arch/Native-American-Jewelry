import { redirect } from 'next/navigation';

export default function WishlistPage() {
  redirect('/account?tab=wishlist');
}

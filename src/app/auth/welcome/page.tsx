import { redirect } from 'next/navigation'

export default function AuthWelcomePage() {
  redirect('/?auth=welcome')
} 
import { redirect } from 'next/navigation'

export default function RecoverPasswordPage() {
  redirect('/?auth=recover-password')
} 
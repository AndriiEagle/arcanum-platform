import { redirect } from 'next/navigation'

export default function UpdatePasswordPage() {
  redirect('/?auth=update-password')
} 
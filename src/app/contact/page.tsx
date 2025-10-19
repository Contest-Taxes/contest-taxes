// src/app/contact/page.tsx
import ContactForm from '@/components/ContactForm';

export default function Page() {
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-semibold">Nous joindre</h1>
      <p className="mt-3 text-gray-600">Écrivez-nous et on vous répond rapidement.</p>
      <ContactForm />
    </section>
  );
}
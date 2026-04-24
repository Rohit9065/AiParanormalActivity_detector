import Chat from '@/components/Chat';

export const metadata = {
  title: 'AetherScan - Paranormal Bot',
  description: 'AI-Powered Paranormal Investigation Assistant',
};

export default function Home() {
  return (
    <>
      <main className="container">
        <header>
          <h1>AetherScan Bot</h1>
          <div className="subtitle">Class-V Entity Analysis System</div>
        </header>
        
        <Chat />
        
      </main>
    </>
  );
}

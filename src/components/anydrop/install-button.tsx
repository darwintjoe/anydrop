'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Install button for the AnyDrop PWA. The `beforeinstallprompt` event only fires
 * when the browser considers the app installable (manifest + service worker + HTTPS).
 * When it has not fired (iOS, or already-installable state), we render nothing —
 * the surrounding instructions cover the manual "Add to Home screen" path.
 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <Button variant="outline" className="bg-white" disabled aria-label="AnyDrop is installed">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        AnyDrop is installed
      </Button>
    );
  }

  if (!deferred) return null;

  return (
    <Button
      className="bg-emerald-600 hover:bg-emerald-700"
      onClick={async () => {
        try {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === 'accepted') setInstalled(true);
        } finally {
          setDeferred(null);
        }
      }}
    >
      <Download className="h-4 w-4" />
      Install AnyDrop app
    </Button>
  );
}

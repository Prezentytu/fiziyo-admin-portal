'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useChatMode } from './useChatMode';

export function ChatModeSettings() {
  const { preference, update } = useChatMode();

  return (
    <Card data-testid="settings-chat-mode-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Tryb czatu (eksperymentalny)</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Zamiast pulpitu: piszesz, czego potrzebujesz, a asystent proponuje zestaw z Twojego katalogu. Klasyczne
          tworzenie zestawów działa dalej.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="settings-chat-mode-switch" className="flex flex-col gap-1">
            <span className="text-[15px] font-medium text-foreground">Widok czatu na stronie głównej</span>
            <span className="text-[13px] font-normal text-label-secondary">
              Przełączysz go też ikoną czatu w nagłówku.
            </span>
          </Label>
          <Switch
            id="settings-chat-mode-switch"
            checked={preference.enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
            data-testid="settings-chat-mode-switch"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="settings-chat-ai-switch" className="flex flex-col gap-1">
            <span className="text-[15px] font-medium text-foreground">Asystent AI</span>
            <span className="text-[13px] font-normal text-label-secondary">
              Każde polecenie zużywa 1 kredyt AI. Imiona pacjentów nie trafiają do modelu. Wyłączony: czat działa na
              regułach i nic nie wychodzi poza FiziYo.
            </span>
          </Label>
          <Switch
            id="settings-chat-ai-switch"
            checked={preference.useAi}
            onCheckedChange={(checked) => update({ useAi: checked })}
            disabled={!preference.enabled}
            data-testid="settings-chat-ai-switch"
          />
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  Dumbbell,
  FileText,
  FolderKanban,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  Settings,
  SquarePen,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Logo } from '@/components/shared/Logo';
import { OrganizationSwitchMenuItems } from '@/components/layout/OrganizationSwitchMenuItems';
import { useCurrentUserDisplay } from '@/components/layout/useCurrentUserDisplay';
import { useAppSignOut } from '@/lib/auth/useAppSignOut';
import { cn } from '@/lib/utils';
import { useChatSession } from './ChatSessionContext';
import { useChatShortcuts } from './useChatShortcuts';
import { useChatMode } from './useChatMode';
import { groupConversationsByDay, type StoredConversation } from './utils/conversationStore';

interface ChatSidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapse?: () => void;
  readonly isMobileOpen: boolean;
  readonly onMobileClose: () => void;
}

interface NavRow {
  label: string;
  href: string;
  icon: LucideIcon;
  testId: string;
}

const NAV_ROWS: readonly NavRow[] = [
  { label: 'Pacjenci', href: '/patients', icon: Users, testId: 'nav-chat-patients-link' },
  { label: 'Zestawy', href: '/exercise-sets', icon: FolderKanban, testId: 'nav-chat-sets-link' },
  { label: 'Ćwiczenia', href: '/exercises', icon: Dumbbell, testId: 'nav-chat-exercises-link' },
];

const ROW_CLASS =
  'flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[14px] font-medium text-foreground transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-label-secondary';

function SidebarBody({
  onNavigate,
  onCollapse,
}: {
  readonly onNavigate: () => void;
  readonly onCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const account = useCurrentUserDisplay();
  const signOut = useAppSignOut();
  const { update } = useChatMode();
  const {
    isReady,
    inactiveCount,
    credits,
    conversations,
    activeConversationId,
    startConversation,
    openConversation,
    deleteConversation,
    restoreDeletedConversation,
  } = useChatSession();
  const groups = useMemo(() => groupConversationsByDay(conversations), [conversations]);
  const shortcuts = useChatShortcuts();
  const creditsPercent =
    credits && credits.limit > 0 ? Math.min(100, Math.round((credits.remaining / credits.limit) * 100)) : 0;

  const remove = (conversation: StoredConversation) => {
    deleteConversation(conversation.id);
    toast('Rozmowa usunięta', {
      action: { label: 'Cofnij', onClick: () => restoreDeletedConversation(conversation) },
    });
  };

  const run = (action: () => void) => () => {
    action();
    onNavigate();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 px-3 pb-3 pt-3">
      <div className="flex h-10 items-center justify-between gap-2 px-1">
        <Logo size="sm" asLink />
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Zwiń menu"
            data-testid="nav-chat-sidebar-collapse-btn"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-label-secondary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[18px]"
          >
            <PanelLeftClose aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Czat" className="mt-2 flex flex-col gap-0.5">
        <button type="button" className={ROW_CLASS} onClick={run(startConversation)} data-testid="nav-chat-new-btn">
          <SquarePen aria-hidden="true" />
          <span className="flex-1">Nowa rozmowa</span>
          <kbd className="text-[12px] font-normal text-label-tertiary">⌘K</kbd>
        </button>
        {NAV_ROWS.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            onClick={onNavigate}
            data-testid={row.testId}
            aria-current={pathname.startsWith(row.href) ? 'page' : undefined}
            className={cn(ROW_CLASS, pathname.startsWith(row.href) && 'bg-fill-tertiary')}
          >
            <row.icon aria-hidden="true" />
            <span className="flex-1">{row.label}</span>
            {row.href === '/patients' && inactiveCount > 0 && (
              <span
                className="rounded-full bg-status-warning-muted px-2 text-[12px] font-semibold text-status-warning"
                title="Nie ćwiczą od kilku dni"
                data-testid="nav-chat-inactive-count"
              >
                {inactiveCount}
              </span>
            )}
          </Link>
        ))}
        <button
          type="button"
          className={ROW_CLASS}
          onClick={run(shortcuts.scanVisit)}
          disabled={!isReady}
          data-testid="nav-chat-scan-btn"
        >
          <FileText aria-hidden="true" />
          <span className="flex-1">Skanuj wizytę</span>
        </button>
      </nav>

      <section aria-label="Ostatnie rozmowy" className="mt-4 flex min-h-0 flex-1 flex-col">
        {conversations.length === 0 ? (
          <>
            <h2 className="px-2.5 pb-1.5 text-[12px] font-semibold text-label-tertiary">Ostatnie</h2>
            <p className="px-2.5 text-[13px] text-label-tertiary">Tu pojawią się Twoje rozmowy.</p>
          </>
        ) : (
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" data-testid="nav-chat-recent-list">
            {groups.map((group) => (
              <div key={group.label} className="pb-3">
                <h2 className="sticky top-0 z-[1] bg-grouped px-2.5 pb-1.5 pt-1 text-[12px] font-semibold text-label-tertiary">
                  {group.label}
                </h2>
                <ul>
                  {group.conversations.map((conversation) => {
                    const isActive = conversation.id === activeConversationId && pathname === '/';
                    return (
                      <li key={conversation.id} className="group relative">
                        <button
                          type="button"
                          onClick={run(() => openConversation(conversation.id))}
                          aria-current={isActive ? 'true' : undefined}
                          data-testid={`nav-chat-recent-item-${conversation.id}`}
                          className={cn(
                            'flex h-9 w-full items-center rounded-[10px] pl-2.5 pr-9 text-left text-[14px] text-foreground transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive && 'bg-fill-tertiary font-medium'
                          )}
                        >
                          <span className="truncate">{conversation.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(conversation)}
                          aria-label={`Usuń rozmowę: ${conversation.title}`}
                          data-testid={`nav-chat-recent-delete-btn-${conversation.id}`}
                          className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-label-tertiary opacity-0 transition-opacity hover:bg-fill-tertiary hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 [&_svg]:size-4"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {credits && (
        <div
          className="mx-1 mb-1 flex flex-col gap-1.5 rounded-[12px] bg-fill-quaternary px-3 py-2.5"
          data-testid="nav-chat-credits"
        >
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-label-secondary">Kredyty AI</span>
            <b className="font-semibold tabular-nums text-foreground">
              {credits.remaining} / {credits.limit}
            </b>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-fill-tertiary" aria-hidden="true">
            <div className="h-full rounded-full bg-tint-fill" style={{ width: `${creditsPercent}%` }} />
          </div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(ROW_CLASS, 'h-11')} data-testid="nav-chat-user-menu-btn">
            <Avatar className="h-7 w-7">
              <AvatarImage src={account.avatarUrl} alt="" />
              <AvatarFallback className="bg-avatar text-[11px] font-semibold text-avatar-label">
                {account.initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate" title={account.displayName}>
              {account.compactDisplayName}
            </span>
            <MoreHorizontal aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64">
          <OrganizationSwitchMenuItems testIdPrefix="nav-chat-org" onSwitch={onNavigate} />
          <DropdownMenuItem asChild data-testid="nav-chat-settings-link">
            <Link href="/settings" onClick={onNavigate}>
              <Settings aria-hidden="true" />
              Ustawienia
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild data-testid="nav-chat-organization-link">
            <Link href="/organization" onClick={onNavigate}>
              <Building2 aria-hidden="true" />
              Organizacja
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              update({ enabled: false });
              onNavigate();
              router.push('/');
            }}
            data-testid="nav-chat-classic-btn"
          >
            <LayoutGrid aria-hidden="true" />
            Klasyczny panel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()} data-testid="nav-chat-sign-out-btn">
            <LogOut aria-hidden="true" />
            Wyloguj
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Quiet sidebar of the chat shell (design "Czat v2"): conversations first, the rest of the panel one click away. */
export function ChatSidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }: ChatSidebarProps) {
  return (
    <>
      {!isCollapsed && (
        <aside
          aria-label="Menu czatu"
          data-testid="nav-chat-sidebar"
          className="hidden w-[260px] shrink-0 border-r-[0.5px] border-hairline bg-grouped lg:block"
        >
          <SidebarBody onNavigate={() => undefined} onCollapse={onToggleCollapse} />
        </aside>
      )}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="w-[280px] bg-grouped p-0" data-testid="nav-chat-mobile-sidebar">
          <SheetTitle className="sr-only">Menu czatu</SheetTitle>
          <SidebarBody onNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}

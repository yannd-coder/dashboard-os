import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentMessage } from '@/types';

interface Props {
  message: AgentMessage;
  agentName: string;
  agentGradientClass?: string;
  streaming?: boolean;
}

export function MessageBubble({ message, agentName, agentGradientClass, streaming }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-bg-surface2 text-text-secondary border border-border-subtle'
            : cn('text-white', agentGradientClass ?? 'bg-gradient-to-br from-accent-violet to-accent-pink'),
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={cn('flex max-w-[78%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="text-xs text-text-tertiary">{isUser ? 'Toi' : agentName}</div>
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-accent-violet-soft text-text-primary border border-border-violet'
              : 'bg-bg-surface text-text-primary border border-border-subtle',
          )}
        >
          {message.content || (streaming && !isUser ? <span className="opacity-40">…</span> : '')}
          {streaming && !isUser && message.content && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-accent-violet align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

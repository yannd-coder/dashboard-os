import { useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';
import { useAgentChat } from '@/hooks/useAgentChat';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ToolCallBubble } from '@/components/chat/ToolCallBubble';
import { IconSquare } from '@/components/ui/IconSquare';

export function AgentChat() {
  const { code } = useParams<{ code: string }>();
  const agentCode = (code ?? '').toUpperCase();
  const { user } = useAuth();
  const { agents } = useAgents();
  const agent = useMemo(
    () => agents.find((a) => a.code.toUpperCase() === agentCode),
    [agents, agentCode],
  );

  const chat = useAgentChat(agentCode, user?.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages, chat.streaming]);

  if (!agentCode) {
    return (
      <div className="card p-12 text-center">
        <p className="text-text-secondary">Agent introuvable.</p>
        <Link to="/agents" className="mt-4 inline-block text-accent-violet hover:underline">
          ← Retour aux agents
        </Link>
      </div>
    );
  }

  const agentName = agent?.name ?? agentCode;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border-subtle bg-bg-base/50 px-4 py-3">
        <Link
          to="/agents"
          className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Agents
        </Link>
        <span className="text-text-tertiary">/</span>
        {agent ? (
          <div className="flex items-center gap-2">
            <IconSquare icon={agent.icon} gradient={agent.gradient} size="sm" />
            <div>
              <div className="text-sm font-semibold text-text-primary">{agent.name}</div>
              <div className="text-xs text-text-tertiary">{agent.role}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm font-semibold text-text-primary">{agentCode}</div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          conversations={chat.conversations}
          activeId={chat.activeConversationId}
          loading={chat.loadingConversations}
          onSelect={chat.openConversation}
          onNew={chat.newConversation}
          onRename={chat.renameConversation}
          onArchive={chat.archiveConversation}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {chat.loadingMessages && (
                <div className="text-center text-xs text-text-tertiary">Chargement…</div>
              )}
              {!chat.loadingMessages && chat.messages.length === 0 && (
                <div className="card mx-auto max-w-md p-6 text-center">
                  <p className="text-sm text-text-secondary">
                    {agent
                      ? `Dis bonjour à ${agent.name}. ${agent.description ?? ''}`
                      : 'Commence la conversation.'}
                  </p>
                </div>
              )}
              {chat.messages.map((m, i) => {
                if (m.role === 'tool') {
                  // Les messages tool sont consommés par le message assistant précédent (rendus via ToolCallBubble)
                  return null;
                }
                if (m.role === 'assistant') {
                  const toolCalls = m.toolCalls as
                    | Array<{ id: string; name: string; input: unknown }>
                    | undefined;
                  // Cherche le prochain message tool dans le tableau (ses résultats appartiennent à ce assistant)
                  const next = chat.messages[i + 1];
                  const toolResults =
                    next && next.role === 'tool'
                      ? (next.toolResults as
                          | Array<{ tool_use_id: string; content: string; is_error?: boolean }>
                          | undefined)
                      : undefined;
                  const hasText = !!m.content;
                  const hasToolCalls = toolCalls && toolCalls.length > 0;
                  return (
                    <div key={m.id} className="flex flex-col gap-3">
                      {hasText && (
                        <MessageBubble
                          message={m}
                          agentName={agentName}
                          streaming={
                            chat.streaming &&
                            i === chat.messages.length - 1 &&
                            !hasToolCalls
                          }
                        />
                      )}
                      {hasToolCalls && (
                        <ToolCallBubble
                          calls={toolCalls!}
                          results={toolResults}
                          pending={
                            chat.streaming &&
                            !toolResults &&
                            i >= chat.messages.length - 2
                          }
                        />
                      )}
                    </div>
                  );
                }
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    agentName={agentName}
                    streaming={false}
                  />
                );
              })}
              {chat.error && (
                <div className="flex items-start gap-2 rounded-lg border border-accent-pink/40 bg-accent-pink/10 p-3 text-xs text-accent-pink">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{chat.error}</span>
                </div>
              )}
            </div>
          </div>

          <ChatInput
            onSend={chat.sendMessage}
            onStop={chat.stopStreaming}
            streaming={chat.streaming}
            disabled={!user}
            placeholder={agent ? `Parle à ${agent.name}…` : 'Écris un message…'}
          />
        </div>
      </div>
    </div>
  );
}

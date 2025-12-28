'use client';

import AdminLayout from '@/components/AdminLayout';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type InboxMessage = {
  id: string;
  customer_id: string;
  sender: string;
  message: string;
  type: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
};

type FullMessage = {
  id: string;
  sender: string;
  message: string;
  type: string;
  created_at: string;
};

export default function InboxAdminPage() {
  useAdminGuard(); // ✅ Protects this page

  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [fullMessages, setFullMessages] = useState<Record<string, FullMessage[]>>({});
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [isReplying, setIsReplying] = useState<boolean>(false);

  // Helper function to get auth headers
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error getting auth session:', error);
    }
    return headers;
  };

  useEffect(() => {
    async function fetchMessages() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/messages/inbox', { headers });
        const result = await res.json();
        if (res.ok) {
          setMessages(result.data);
        } else {
          console.error('Error fetching messages:', result.error);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }
    fetchMessages();
  }, []);

  const fetchFullConversation = async (customerId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/messages/conversation?customer_id=${customerId}`, {
        headers,
      });
      const result = await res.json();
      if (res.ok) {
        setFullMessages((prev) => ({ ...prev, [customerId]: result.data }));
      } else {
        console.error('Error fetching conversation:', result.error);
      }
    } catch (err) {
      console.error('Fetch conversation error:', err);
    }
  };

  const handleToggle = async (customerId: string) => {
    if (openCustomerId === customerId) {
      setOpenCustomerId(null);
      return;
    }

    if (!fullMessages[customerId]) {
      await fetchFullConversation(customerId);
    }

    setOpenCustomerId(customerId);
  };

  const handleSendReply = async (customerId: string) => {
    if (!replyMessage.trim()) return;
    setIsReplying(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/messages/reply', {
        method: 'POST',
        headers,
        body: JSON.stringify({ customerId, message: replyMessage }),
      });
      if (res.ok) {
        setReplyMessage('');
        await fetchFullConversation(customerId);
      } else {
        console.error('Error sending reply');
      }
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <AdminLayout>
    <section className="p-8">
      <h2 className="text-3xl font-bold mb-6">Inbox</h2>
      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="border rounded shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">{msg.first_name} {msg.last_name} ({msg.email})</div>
                <div className="text-gray-600 text-sm">{new Date(msg.created_at).toLocaleString()}</div>
                <div className="mt-2">{msg.message}</div>
                <div className="text-xs text-gray-500 mt-1">Type: {msg.type} | Sender: {msg.sender}</div>
              </div>
              <button
                onClick={() => handleToggle(msg.customer_id)}
                className="text-sm bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800"
              >
                {openCustomerId === msg.customer_id ? "Close" : "View Conversation"}
              </button>
            </div>

            {openCustomerId === msg.customer_id && (
              <div className="mt-4 border-t pt-2 space-y-2">
                {fullMessages[msg.customer_id]?.map((fm) => (
                  <div key={fm.id} className="bg-gray-100 p-2 rounded">
                    <div className="text-sm">
                      <strong>{fm.sender.toUpperCase()}</strong> — {new Date(fm.created_at).toLocaleString()}
                    </div>
                    <div>{fm.message}</div>
                  </div>
                ))}
                <div className="mt-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full border rounded p-2 mb-2"
                  />
                  <button
                    onClick={() => handleSendReply(msg.customer_id)}
                    disabled={isReplying}
                    className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
                  >
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
    </AdminLayout>
  );
}

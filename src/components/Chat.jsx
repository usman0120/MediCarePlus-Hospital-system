/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faPaperclip,
  faTimes,
  faCheck,
  faCheckDouble,
  faFile,
  faImage,
  faFilePdf,
  faChartBar,
  faFileWord,
  faFileExcel,
  faFileAudio,
  faFileVideo,
  faDownload,
  faSpinner,
  faSmile,
  faSearch,
  faExclamationTriangle,
  faCog,
  faRedo,
  faInfoCircle,
  faTrash,
  faEllipsisVertical,
  faEye,
  faCopy,
  faClock,
  faBell,
  faBellSlash,
  faThumbtack,
  faExpand,
  faCompress,
  faChevronUp,
  faChevronDown,
  faCircle,
  faRobot,
  faReply,
  faEdit,
  faCheckCircle,
  faBan
} from '@fortawesome/free-solid-svg-icons';
import {
  sendMessage,
  createOrGetChat,
  getChatMessages,
  markMessagesAsRead,
  subscribeToMessages,
  deleteMessage,
  togglePinMessage,
  getUnreadCounts,
  addReaction,
  removeReaction,
  editMessage
} from '../database';
import { compressData, formatDate, formatFileSize, decompressData } from '../utils/helpers';
import { validateChatMessage } from '../utils/validators';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const Chat = ({ 
  userId, 
  userRole, 
  otherUserId, 
  otherUserName, 
  otherUserProfileImage,
  otherUserRole = 'patient',
  onClose,
  onMessageSent,
  autoReplyMessage = "Thank you for your message. I'm currently away from my desk. I'll respond as soon as possible during working hours (9 AM - 5 PM).",
  workingHours = { start: 9, end: 17 } // 9 AM to 5 PM
}) => {
  const { currentUser } = useAuth();
  const isOnline = useOnlineStatus();
  
  // State management
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState('offline');
  const [typingStatus, setTypingStatus] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [isWithinWorkingHours, setIsWithinWorkingHours] = useState(true);
  const [autoReplySent, setAutoReplySent] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatDetails, setChatDetails] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const observerRef = useRef(null);
  const searchInputRef = useRef(null);
  const messageRefs = useRef({});
  const isMounted = useRef(true);
  const retryTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  // Check working hours
  useEffect(() => {
    const checkWorkingHours = () => {
      const now = new Date();
      const hours = now.getHours();
      const isWorking = hours >= workingHours.start && hours < workingHours.end;
      setIsWithinWorkingHours(isWorking);
    };

    checkWorkingHours();
    const interval = setInterval(checkWorkingHours, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [workingHours.start, workingHours.end]);

  // ==================== MEMOIZED VALUES ====================

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return dateA - dateB;
    });
  }, [messages]);

  const REACTIONS = useMemo(() => ['👍', '❤️', '😊', '🎉', '🤔', '👏', '🔥', '💯'], []);

  // Filter messages by search term
  const filteredMessages = useMemo(() => {
    if (!searchTerm) return sortedMessages;
    return sortedMessages.filter(msg => 
      msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.file?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sortedMessages, searchTerm]);

  // ==================== SCROLL UTILITIES ====================

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const scrollToMessage = useCallback((messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight temporarily
      element.classList.add('highlight-message');
      setTimeout(() => {
        element.classList.remove('highlight-message');
      }, 2000);
    }
  }, []);

  // ==================== AUTO-REPLY ====================

  const sendAutoReply = useCallback(async () => {
    if (!chatId || autoReplySent || !otherUserId || !currentUser || !isMounted.current) return;

    // Check if auto-reply already sent in last hour
    const lastAutoReply = messages.find(m => m.isAutoReply && m.senderId === otherUserId);
    if (lastAutoReply) {
      const lastReplyTime = lastAutoReply.timestamp?.toDate ? lastAutoReply.timestamp.toDate() : new Date(lastAutoReply.timestamp);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastReplyTime > hourAgo) {
        setAutoReplySent(true);
        return;
      }
    }

    const autoReplyData = {
      chatId,
      senderId: otherUserId,
      recipientId: currentUser.uid,
      text: autoReplyMessage,
      status: 'sent',
      timestamp: new Date(),
      isAutoReply: true,
      isRead: false,
      reactions: []
    };

    try {
      const result = await sendMessage(chatId, autoReplyData);
      
      if (result.success && isMounted.current) {
        setAutoReplySent(true);
        toast.success('Auto-reply sent', {
          icon: '🤖',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Auto-reply error:', error);
    }
  }, [chatId, otherUserId, currentUser, autoReplyMessage, autoReplySent, messages]);

  // ==================== FILE HANDLING ====================

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${formatFileSize(maxSize)}`);
      return;
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('File type not supported. Please upload images, PDFs, documents, audio, or video files.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      
      setAttachment({
        name: file.name,
        type: file.type,
        data: base64Data,
        size: file.size
      });

      // Create preview for images
      if (file.type.startsWith('image/')) {
        setAttachmentPreview(reader.result);
      } else {
        setAttachmentPreview(null);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  }, []);

  const processFileForStorage = useCallback(async (fileData) => {
    try {
      // Compress if it's an image or large file
      if (fileData.type.startsWith('image/') || fileData.size > 1024 * 1024) {
        const compressed = await compressData(fileData.data);
        if (compressed) {
          return {
            ...fileData,
            data: compressed,
            isCompressed: true,
            isEncoded: false
          };
        }
      }
      
      // Return as is if compression fails or not needed
      return {
        ...fileData,
        isCompressed: false,
        isEncoded: false
      };
    } catch (error) {
      console.error('File processing error:', error);
      return null;
    }
  }, []);

  const handleDownloadFile = useCallback((fileData, fileName, fileType, isCompressed = false) => {
    try {
      let dataToDownload = fileData;
      
      // Decompress if needed
      if (isCompressed) {
        const decompressed = decompressData(fileData);
        if (decompressed) {
          dataToDownload = decompressed;
        } else {
          toast.error('Failed to decompress file');
          return;
        }
      }

      // Create download link
      const link = document.createElement('a');
      link.href = `data:${fileType};base64,${dataToDownload}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  }, []);

  const handleViewFile = useCallback((fileData, fileType, isCompressed = false) => {
    try {
      let dataToView = fileData;
      
      // Decompress if needed
      if (isCompressed) {
        const decompressed = decompressData(fileData);
        if (decompressed) {
          dataToView = decompressed;
        } else {
          toast.error('Failed to decompress file');
          return;
        }
      }

      // Open in new tab
      const newWindow = window.open();
      if (newWindow) {
        if (fileType.startsWith('image/')) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Image Viewer</title>
              <style>
                body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f0f0; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="data:${fileType};base64,${dataToView}" alt="Image" />
            </body>
            </html>
          `);
        } else if (fileType === 'application/pdf') {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>PDF Viewer</title>
              <style>
                body { margin: 0; height: 100vh; }
                embed { width: 100%; height: 100%; }
              </style>
            </head>
            <body>
              <embed src="data:${fileType};base64,${dataToView}" type="application/pdf" />
            </body>
            </html>
          `);
        } else {
          // For other file types, trigger download
          handleDownloadFile(fileData, 'file', fileType, isCompressed);
        }
      }
    } catch (error) {
      console.error('View file error:', error);
      toast.error('Failed to view file');
    }
  }, [handleDownloadFile]);

  // ==================== MESSAGE HANDLING ====================

const handleSendMessage = useCallback(async () => {
  if ((!newMessage.trim() && !attachment) || !chatId || sending) return;

  // Check if outside working hours for doctor
  if (userRole === 'patient' && !isWithinWorkingHours && otherUserRole === 'doctor') {
    const confirmSend = window.confirm(
      `Doctor's working hours are ${workingHours.start}:00 to ${workingHours.end}:00. ` +
      'They may not respond until then. Do you still want to send?'
    );
    if (!confirmSend) return;
  }

  // Validate message
  const validation = validateChatMessage({
    text: newMessage,
    file: attachment
  });

  if (!validation.isValid) {
    toast.error(validation.errors.message || validation.errors.file);
    return;
  }

  setSending(true);
  setError(null);

  try {
    let processedFile = null;

    if (attachment) {
      processedFile = await processFileForStorage(attachment);
      if (!processedFile) {
        toast.error('Failed to process attachment');
        setSending(false);
        return;
      }
    }

    // Create a MORE UNIQUE optimistic message ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${performance.now()}-${crypto.randomUUID?.() || Math.random()}`;
    
    const optimisticMessage = {
      id: tempId, // Use temp ID as the key
      tempId: tempId,
      chatId,
      senderId: currentUser.uid,
      recipientId: otherUserId,
      text: newMessage,
      file: processedFile ? {
        name: processedFile.name,
        type: processedFile.type,
        data: '[FILE]',
        size: processedFile.size,
        isCompressed: processedFile.isCompressed,
        isEncoded: processedFile.isEncoded
      } : null,
      status: 'sending',
      timestamp: new Date(),
      optimistic: true,
      isRead: false,
      reactions: [],
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderId: replyingTo.senderId
      } : null
    };

    // Add optimistic message
    setMessages(prev => {
      // Check if we already have this temp message (avoid duplicates)
      const exists = prev.some(msg => msg.id === tempId || msg.tempId === tempId);
      if (exists) return prev;
      return [...prev, optimisticMessage];
    });
    
    setNewMessage('');
    setAttachment(null);
    setAttachmentPreview(null);
    setReplyingTo(null);
    scrollToBottom();

    const messageData = {
      chatId,
      senderId: currentUser.uid,
      recipientId: otherUserId,
      text: newMessage,
      file: processedFile,
      status: 'sent',
      timestamp: new Date(),
      tempId: tempId, // Include tempId in the message data
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderId: replyingTo.senderId
      } : null
    };

    const result = await sendMessage(chatId, messageData);

    if (result.success && isMounted.current) {
      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => 
          (msg.id === tempId || msg.tempId === tempId) 
            ? { ...result.data, optimistic: false } 
            : msg
        )
      );

      if (onMessageSent) {
        onMessageSent(result.data);
      }

      // Send auto-reply if needed
      if (otherUserRole === 'doctor' && !isWithinWorkingHours && !autoReplySent && userRole === 'patient') {
        setTimeout(() => {
          sendAutoReply();
        }, 2000);
      }
    } else if (isMounted.current) {
      // Mark optimistic message as failed
      setMessages(prev => 
        prev.map(msg => 
          (msg.id === tempId || msg.tempId === tempId) 
            ? { ...msg, status: 'failed', error: result.error } 
            : msg
        )
      );
      toast.error(result.error || 'Failed to send message');
    }
  } catch (error) {
    console.error('Send message error:', error);
    toast.error('Failed to send message. Please try again.');
  } finally {
    setSending(false);
  }
}, [newMessage, attachment, chatId, sending, userRole, isWithinWorkingHours, otherUserRole, workingHours.start, workingHours.end, currentUser, otherUserId, scrollToBottom, onMessageSent, autoReplySent, sendAutoReply, processFileForStorage, replyingTo]);

  const handleRetryMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !chatId) return;

    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status: 'sending' } : msg
      )
    );

    try {
      const messageData = {
        chatId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        text: message.text,
        file: message.file ? {
          name: message.file.name,
          type: message.file.type,
          data: message.file.data === '[FILE]' ? null : message.file.data,
          size: message.file.size,
          isCompressed: message.file.isCompressed,
          isEncoded: message.file.isEncoded
        } : null,
        status: 'sent',
        timestamp: new Date(),
        replyTo: message.replyTo
      };

      const result = await sendMessage(chatId, messageData);
      
      if (result.success && isMounted.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...result.data, status: 'sent', optimistic: false } : msg
          )
        );
        toast.success('Message resent');
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, status: 'failed' } : msg
          )
        );
        toast.error(result.error || 'Failed to resend message');
      }
    } catch (error) {
      console.error('Retry error:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        )
      );
      toast.error('Failed to resend message');
    }
  }, [messages, chatId]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    if (!chatId || !currentUser) return;

    try {
      const result = await deleteMessage(messageId, chatId, currentUser.uid);
      
      if (result.success && isMounted.current) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast.success('Message deleted');
      } else {
        toast.error(result.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete message');
    }
  }, [chatId, currentUser]);

  const handleEditMessage = useCallback(async () => {
    if (!editingMessage || !editText.trim() || !chatId || !currentUser) return;

    try {
      const result = await editMessage(editingMessage.id, currentUser.uid, editText);
      
      if (result.success && isMounted.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === editingMessage.id 
              ? { ...msg, text: editText, isEdited: true, editedAt: new Date() }
              : msg
          )
        );
        setEditingMessage(null);
        setEditText('');
        toast.success('Message edited');
      } else {
        toast.error(result.error || 'Failed to edit message');
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to edit message');
    }
  }, [editingMessage, editText, chatId, currentUser]);

  const handleCopyMessage = useCallback((text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Message copied to clipboard'))
      .catch(() => toast.error('Failed to copy message'));
  }, []);

  // ==================== REACTION HANDLING ====================

  const handleAddReaction = useCallback(async (messageId, reaction) => {
    if (!chatId || !currentUser) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const userReaction = message.reactions?.find(r => r.userId === currentUser.uid);
    
    try {
      if (userReaction) {
        if (userReaction.reaction === reaction) {
          // Remove reaction
          await removeReaction(messageId, currentUser.uid, reaction);
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                reactions: msg.reactions.filter(r => !(r.userId === currentUser.uid && r.reaction === reaction))
              };
            }
            return msg;
          }));
        } else {
          // Change reaction
          await removeReaction(messageId, currentUser.uid, userReaction.reaction);
          await addReaction(messageId, currentUser.uid, reaction);
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                reactions: [
                  ...msg.reactions.filter(r => r.userId !== currentUser.uid),
                  { userId: currentUser.uid, reaction, timestamp: new Date() }
                ]
              };
            }
            return msg;
          }));
        }
      } else {
        // Add new reaction
        await addReaction(messageId, currentUser.uid, reaction);
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), { userId: currentUser.uid, reaction, timestamp: new Date() }]
            };
          }
          return msg;
        }));
      }
      
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Reaction error:', error);
      toast.error('Failed to add reaction');
    }
  }, [chatId, currentUser, messages]);

  // ==================== PIN HANDLING ====================

  const handleTogglePin = useCallback(async (messageId) => {
    if (!chatId || !currentUser) return;

    const isPinned = pinnedMessages.includes(messageId);
    
    try {
      const result = await togglePinMessage(chatId, messageId, currentUser.uid, !isPinned);
      
      if (result.success) {
        setPinnedMessages(prev => 
          isPinned ? prev.filter(id => id !== messageId) : [...prev, messageId]
        );
        toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
      } else {
        toast.error(result.error || 'Failed to update pin');
      }
    } catch (error) {
      console.error('Pin error:', error);
      toast.error('Failed to update pin');
    }
  }, [chatId, currentUser, pinnedMessages]);

  // ==================== CHAT INITIALIZATION ====================

    const loadMessages = useCallback(async (chatIdToLoad, lastMsg = null) => {
    try {
      const result = await getChatMessages(chatIdToLoad, lastMsg, 50);
      
      if (result.success && isMounted.current) {
        setMessages(prev => {
          const newMessages = result.data;
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNewMessages];
        });
        
        setLastVisible(result.lastDoc);
        setHasMore(result.data.length === 50);
        
        // Mark new messages as read
        const unreadMessages = result.data.filter(
          msg => msg.senderId !== currentUser?.uid && !msg.isRead
        );
        
        if (unreadMessages.length > 0 && currentUser) {
          const messageIds = unreadMessages.map(msg => msg.id);
          await markMessagesAsRead(chatIdToLoad, currentUser.uid, messageIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentUser]);

  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Validate participants
    if (!userId || !otherUserId || userId === otherUserId) {
      setError('Invalid chat participants');
      setLoading(false);
      return;
    }
    
    try {
      // Create or get existing chat
      const result = await createOrGetChat(userId, otherUserId);
      
      if (result.success && isMounted.current) {
        setChatId(result.data.id);
        setChatDetails(result.data);
        
        // Check pinned messages
        if (result.data.pinnedMessages) {
          setPinnedMessages(result.data.pinnedMessages);
        }
        
        // Load initial messages
        await loadMessages(result.data.id);
      } else {
        setError(result.error || 'Failed to initialize chat');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat');
    } finally {
      setLoading(false);
    }
  }, [userId, otherUserId, loadMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !chatId || !lastVisible) return;
    
    setLoadingMore(true);
    await loadMessages(chatId, lastVisible);
    setLoadingMore(false);
  }, [hasMore, loadingMore, chatId, lastVisible, loadMessages]);

// ==================== REAL-TIME SUBSCRIPTION ====================

const handleNewMessages = useCallback(async (newMessages) => {
  if (!isMounted.current || !chatId || !currentUser) return;

  setMessages(prevMessages => {
    // Create a map with better duplicate detection
    const messageMap = new Map();
    
    // Add all existing messages first
    prevMessages.forEach(msg => {
      // Store all messages, but track optimistic ones separately
      messageMap.set(msg.id, msg);
    });
    
    // Process new messages from server
    newMessages.forEach(newMsg => {
      // Check if this new message corresponds to an optimistic message
      // by comparing temporary IDs or content
      const matchingOptimistic = Array.from(messageMap.values()).find(prevMsg => {
        if (prevMsg.optimistic && prevMsg.status === 'sending') {
          // Match by temporary ID if available, or by content and timestamp proximity
          if (prevMsg.tempId && newMsg.tempId) {
            return prevMsg.tempId === newMsg.tempId;
          }
          // Fallback: match by sender, recipient, text content (within last 10 seconds)
          if (prevMsg.senderId === newMsg.senderId && 
              prevMsg.recipientId === newMsg.recipientId &&
              prevMsg.text === newMsg.text) {
            const prevTime = prevMsg.timestamp?.toDate ? prevMsg.timestamp.toDate() : new Date(prevMsg.timestamp);
            const newTime = newMsg.timestamp?.toDate ? newMsg.timestamp.toDate() : new Date(newMsg.timestamp);
            const timeDiff = Math.abs(prevTime - newTime);
            return timeDiff < 10000; // Within 10 seconds
          }
        }
        return false;
      });
      
      if (matchingOptimistic) {
        // Replace the optimistic message with the real server message
        messageMap.delete(matchingOptimistic.id);
        messageMap.set(newMsg.id, { ...newMsg, optimistic: false });
      } else if (!messageMap.has(newMsg.id)) {
        // Add new message if not already present
        messageMap.set(newMsg.id, newMsg);
      }
    });
    
    // Convert map back to array and sort by timestamp
    const result = Array.from(messageMap.values());
    return result.sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return dateA - dateB;
    });
  });

  // Mark unread messages as read
  const unreadMessages = newMessages.filter(
    msg => msg.senderId !== currentUser?.uid && !msg.isRead
  );
  
  if (unreadMessages.length > 0) {
    const messageIds = unreadMessages.map(msg => msg.id);
    try {
      await markMessagesAsRead(chatId, currentUser.uid, messageIds);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  // Scroll to bottom if near bottom
  if (chatContainerRef.current) {
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom) {
      scrollToBottom();
    }
  }

  // Update unread count
  if (chatId && currentUser) {
    const unreadResult = await getUnreadCounts(currentUser.uid);
    if (unreadResult.success && unreadResult.data[chatId] !== undefined) {
      setUnreadCount(unreadResult.data[chatId]);
    }
  }
}, [chatId, currentUser, scrollToBottom]);

  // Setup message subscription
  useEffect(() => {
    if (!chatId) return;

    let unsubscribe;

    const setupSubscription = () => {
      try {
        unsubscribe = subscribeToMessages(chatId, handleNewMessages);
        setConnectionStatus('connected');
        setRetryCount(0);
      } catch (error) {
        console.error('Subscription error:', error);
        setConnectionStatus('disconnected');
        
        // Retry with exponential backoff
        if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000;
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setupSubscription();
          }, delay);
        } else {
          toast.error('Unable to establish real-time connection. Please refresh.');
        }
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [chatId, handleNewMessages, retryCount]);

  // ==================== INITIALIZATION EFFECT ====================

  // Add this useEffect to clean up duplicate messages
useEffect(() => {
  if (messages.length === 0) return;
  
  // Check for duplicate messages (by ID)
  const seenIds = new Set();
  const duplicates = [];
  
  messages.forEach((msg, index) => {
    if (seenIds.has(msg.id)) {
      duplicates.push({ id: msg.id, index });
    } else {
      seenIds.add(msg.id);
    }
  });
  
  // Remove duplicates if found
  if (duplicates.length > 0) {
    console.warn(`Found ${duplicates.length} duplicate message IDs, cleaning up...`);
    setMessages(prev => {
      const uniqueMap = new Map();
      prev.forEach(msg => {
        // Keep the first occurrence (which is likely the real message, not optimistic)
        if (!uniqueMap.has(msg.id) || (!msg.optimistic && uniqueMap.get(msg.id)?.optimistic)) {
          uniqueMap.set(msg.id, msg);
        }
      });
      return Array.from(uniqueMap.values());
    });
  }
}, [messages]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [loading, messages.length, scrollToBottom]);

  // ==================== TYPING INDICATOR ====================

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      // TODO: Emit typing event when presence system is implemented
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // TODO: Emit stop typing event
    }, 1500);
  }, [isTyping]);

  // ==================== SCROLL OBSERVER FOR READ RECEIPTS ====================

  useEffect(() => {
    if (!chatContainerRef.current || !chatId || !currentUser) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            const message = messages.find(m => m.id === messageId);
            
            if (message && message.senderId !== currentUser.uid && !message.isRead) {
              markMessagesAsRead(chatId, currentUser.uid, [messageId])
                .catch(console.error);
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '50px' }
    );

    // Observe all message elements
    const messageElements = chatContainerRef.current.querySelectorAll('[data-message-id]');
    messageElements.forEach(el => observerRef.current?.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [chatId, messages, currentUser]);

  // ==================== ONLINE STATUS SIMULATION ====================

  // Simulate online status (in production, use Firebase Realtime Database or Presence system)
  useEffect(() => {
    if (!otherUserId) return;

    // Random online status simulation
    const updateStatus = () => {
      const statuses = ['online', 'offline', 'away'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setOnlineStatus(randomStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [otherUserId]);

  // ==================== KEYBOARD HANDLERS ====================

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
    
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }

    if (e.key === 'Escape') {
      if (editingMessage) {
        setEditingMessage(null);
        setEditText('');
      } else if (replyingTo) {
        setReplyingTo(null);
      } else if (showSearch) {
        setShowSearch(false);
        setSearchTerm('');
      }
    }

    if (e.key === 'f' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [handleSendMessage, editingMessage, handleEditMessage, replyingTo, showSearch]);

  // ==================== SEARCH HANDLERS ====================

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const results = sortedMessages.reduce((acc, msg, index) => {
      if (msg.text?.toLowerCase().includes(term.toLowerCase()) ||
          msg.file?.name?.toLowerCase().includes(term.toLowerCase())) {
        acc.push({ index, id: msg.id });
      }
      return acc;
    }, []);

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);

    if (results.length > 0) {
      scrollToMessage(results[0].id);
      
      // Highlight search term in messages
      results.forEach(result => {
        const element = messageRefs.current[result.id];
        if (element) {
          element.classList.add('search-match');
        }
      });
    }
  }, [sortedMessages, scrollToMessage]);

  const navigateSearch = useCallback((direction) => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex - 1;
      if (newIndex < 0) newIndex = searchResults.length - 1;
    }

    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex].id);
  }, [searchResults, currentSearchIndex, scrollToMessage]);

  // ==================== HELPER FUNCTIONS ====================

  const getFileIcon = useCallback((fileType) => {
    if (fileType?.includes('pdf')) return faFilePdf;
    if (fileType?.includes('image')) return faImage;
    if (fileType?.includes('audio')) return faFileAudio;
    if (fileType?.includes('video')) return faFileVideo;
    if (fileType?.includes('word') || fileType?.includes('document')) return faFileWord;
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return faFileExcel;
    if (fileType?.includes('text')) return faFile;
    return faFile;
  }, []);

  const getMessageStatusIcon = useCallback((status, isOptimistic, isRead) => {
    if (isOptimistic) {
      return <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400" size="xs" />;
    }
    
    switch (status) {
      case 'sending':
        return <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400" size="xs" />;
      case 'sent':
        return isRead 
          ? <FontAwesomeIcon icon={faCheckDouble} className="text-blue-500" size="xs" />
          : <FontAwesomeIcon icon={faCheck} className="text-gray-400" size="xs" />;
      case 'delivered':
        return <FontAwesomeIcon icon={faCheckDouble} className="text-gray-400" size="xs" />;
      case 'seen':
        return <FontAwesomeIcon icon={faCheckDouble} className="text-blue-500" size="xs" />;
      case 'failed':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" size="xs" />;
      default:
        return null;
    }
  }, []);

  // ==================== RENDER MESSAGE ====================

  const renderMessage = useCallback((message) => {
    const isOwn = message.senderId === currentUser?.uid;
    const isOptimistic = message.optimistic;
    const isFailed = message.status === 'failed';
    const isAutoReply = message.isAutoReply;
    const isPinned = pinnedMessages.includes(message.id);
    const isDeleted = message.isDeleted;
    const isEdited = message.isEdited;
    const messageReactions = message.reactions || [];
    
    // Group reactions by type
    const reactionGroups = messageReactions.reduce((acc, r) => {
      if (!acc[r.reaction]) {
        acc[r.reaction] = { count: 1, users: [r.userId] };
      } else {
        acc[r.reaction].count++;
        acc[r.reaction].users.push(r.userId);
      }
      return acc;
    }, {});

    // Check if current user reacted
    const userReaction = messageReactions.find(r => r.userId === currentUser?.uid)?.reaction;

    return (
      <div
key={`${message.id}-${message.timestamp?.toDate?.()?.getTime() || message.timestamp}-${message.optimistic ? 'opt' : 'real'}`}
    ref={el => messageRefs.current[message.id] = el}
    data-message-id={message.id}
    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group relative transition-all ${
      searchTerm && message.text?.toLowerCase().includes(searchTerm.toLowerCase()) ? 'search-match' : ''
    }`}
        onContextMenu={(e) => {
          e.preventDefault();
          setSelectedMessage(message);
          setShowMessageOptions(true);
        }}
      >
        {!isOwn && (
          <div className="flex-shrink-0 mr-3 mt-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                {otherUserName?.charAt(0) || 'U'}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                onlineStatus === 'online' ? 'bg-green-500' : 
                onlineStatus === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
            </div>
          </div>
        )}
        
        <div className={`max-w-[70%] ${isOwn ? 'order-1' : 'order-2'}`}>
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={`flex items-center mb-1 text-xs ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`px-3 py-1 rounded-full ${
                isOwn ? 'bg-blue-500/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <FontAwesomeIcon icon={faReply} className="mr-1 text-gray-500" size="xs" />
                <span className="text-gray-600 dark:text-gray-300">
                  Replying to {message.replyTo.senderId === currentUser?.uid ? 'yourself' : otherUserName}
                </span>
              </div>
            </div>
          )}

          {/* Message header for non-own messages */}
          {!isOwn && (
  <div className="flex-shrink-0 mr-3 mt-1">
    <div className="relative">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
        {otherUserProfileImage ? (
          <img 
            src={otherUserProfileImage} 
            alt={otherUserName} 
            className="w-full h-full object-cover"
          />
        ) : (
          otherUserName?.charAt(0) || 'U'
        )}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
        onlineStatus === 'online' ? 'bg-green-500' : 
        onlineStatus === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
      }`} />
    </div>
  </div>
)}

          {/* Message bubble */}
          <div
            className={`rounded-2xl px-4 py-3 relative break-words ${
              isDeleted
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 italic'
                : isFailed
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
                : isAutoReply
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                : isOwn
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm'
            } ${isOptimistic ? 'opacity-70' : ''} ${isPinned ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
          >
            {/* Pinned indicator */}
            {isPinned && !isDeleted && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-yellow-500 text-white rounded-full p-1 shadow-lg">
                  <FontAwesomeIcon icon={faThumbtack} size="xs" />
                </div>
              </div>
            )}

            {/* Deleted message */}
            {isDeleted ? (
              <p className="text-sm italic flex items-center">
                <FontAwesomeIcon icon={faBan} className="mr-2 text-gray-400" />
                This message was deleted
              </p>
            ) : (
              <>
                {/* Message text */}
                {message.text && (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.text}
                    {isEdited && (
                      <span className="text-xs opacity-70 ml-2">(edited)</span>
                    )}
                  </p>
                )}
                
                {/* File attachment */}
                {message.file && (
                  <div className="mt-3">
                    {message.file.type?.startsWith('image/') && message.file.data !== '[FILE]' ? (
                      <div className="relative group/image">
                        <img
                          src={`data:${message.file.type};base64,${message.file.data}`}
                          alt={message.file.name}
                          className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition border border-gray-300 dark:border-gray-600"
                          onClick={() => handleViewFile(
                            message.file.data, 
                            message.file.type, 
                            message.file.isCompressed
                          )}
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile(
                                message.file.data, 
                                message.file.name, 
                                message.file.type,
                                message.file.isCompressed
                              );
                            }}
                            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition"
                            title="Download"
                          >
                            <FontAwesomeIcon icon={faDownload} size="sm" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewFile(
                                message.file.data, 
                                message.file.type,
                                message.file.isCompressed
                              );
                            }}
                            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition"
                            title="View full size"
                          >
                            <FontAwesomeIcon icon={faExpand} size="sm" />
                          </button>
                        </div>
                      </div>
                    ) : message.file.data !== '[FILE]' ? (
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${
                        isOwn 
                          ? 'bg-blue-600/20 border-blue-400/30' 
                          : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg ${
                            isOwn ? 'bg-blue-500/30' : 'bg-blue-100 dark:bg-blue-900'
                          }`}>
                            <FontAwesomeIcon 
                              icon={getFileIcon(message.file.type)} 
                              className={isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {message.file.name}
                            </p>
                            <p className="text-xs opacity-75">
                              {formatFileSize(message.file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {message.file.type === 'application/pdf' && (
                            <button
                              onClick={() => handleViewFile(
                                message.file.data, 
                                message.file.type,
                                message.file.isCompressed
                              )}
                              className={`p-2 rounded-lg transition ${
                                isOwn 
                                  ? 'hover:bg-blue-500/30 text-white' 
                                  : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                              }`}
                              title="View"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadFile(
                              message.file.data, 
                              message.file.name, 
                              message.file.type,
                              message.file.isCompressed
                            )}
                            className={`p-2 rounded-lg transition ${
                              isOwn 
                                ? 'hover:bg-blue-500/30 text-white' 
                                : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}
                            title="Download"
                          >
                            <FontAwesomeIcon icon={faDownload} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse">
                        <FontAwesomeIcon icon={getFileIcon(message.file.type)} className="text-gray-500" />
                        <div className="flex-1">
                          <p className="text-sm truncate">{message.file.name}</p>
                          <p className="text-xs text-gray-500">Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(reactionGroups).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(reactionGroups).map(([reaction, { count, users }]) => (
                      <button
                        key={reaction}
                        onClick={() => handleAddReaction(message.id, reaction)}
                        className={`px-2 py-0.5 rounded-full text-xs flex items-center space-x-1 transition ${
                          users.includes(currentUser?.uid)
                            ? isOwn
                              ? 'bg-blue-500/30 text-white'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : isOwn
                              ? 'bg-blue-500/20 text-white/80 hover:bg-blue-500/30'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title={users.map(id => id === currentUser?.uid ? 'You' : 'User').join(', ')}
                      >
                        <span>{reaction}</span>
                        <span className="ml-1 text-xs">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Message metadata */}
          <div className={`flex items-center mt-1 text-xs text-gray-500 space-x-2 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}>
            <span className="flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-1 text-[10px]" />
              {message.timestamp?.toDate 
                ? formatDate(message.timestamp.toDate(), { hour: '2-digit', minute: '2-digit' })
                : formatDate(message.timestamp, { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {isOwn && !isDeleted && (
              <span className="flex items-center">
                {getMessageStatusIcon(message.status, isOptimistic, message.isRead)}
              </span>
            )}

            {isFailed && (
              <button
                onClick={() => handleRetryMessage(message.id)}
                className="text-red-500 hover:text-red-600 flex items-center text-xs"
              >
                <FontAwesomeIcon icon={faRedo} className="mr-1" />
                Retry
              </button>
            )}

            {!isDeleted && (
              <>
                {/* Reactions button */}
                <button
                  onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600"
                  title="Add reaction"
                >
                  <FontAwesomeIcon icon={faSmile} className="text-xs" />
                </button>

                {/* Reply button */}
                <button
                  onClick={() => setReplyingTo({
                    id: message.id,
                    text: message.text || (message.file ? '📎 File' : ''),
                    senderId: message.senderId
                  })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600"
                  title="Reply"
                >
                  <FontAwesomeIcon icon={faReply} className="text-xs" />
                </button>

                {/* More options button */}
                <button
                  onClick={() => {
                    setSelectedMessage(message);
                    setShowMessageOptions(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-700"
                  title="More options"
                >
                  <FontAwesomeIcon icon={faEllipsisVertical} className="text-xs" />
                </button>
              </>
            )}
          </div>

          {/* Reaction picker */}
          {showReactionPicker === message.id && !isDeleted && (
            <div className="absolute mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex space-x-1 z-10">
              {REACTIONS.map(reaction => (
                <button
                  key={reaction}
                  onClick={() => handleAddReaction(message.id, reaction)}
                  className={`w-8 h-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-lg flex items-center justify-center ${
                    userReaction === reaction ? 'bg-blue-100 dark:bg-blue-900' : ''
                  }`}
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [currentUser?.uid, pinnedMessages, searchTerm, otherUserName, onlineStatus, otherUserProfileImage, getFileIcon, getMessageStatusIcon, showReactionPicker, REACTIONS, handleViewFile, handleDownloadFile, handleAddReaction, handleRetryMessage]);

  // ==================== MESSAGE OPTIONS MODAL ====================

  const renderMessageOptions = () => {
    if (!showMessageOptions || !selectedMessage || selectedMessage.isDeleted) return null;

    const isOwn = selectedMessage.senderId === currentUser?.uid;
    const isPinned = pinnedMessages.includes(selectedMessage.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Message Options
            </h3>
            <button
              onClick={() => setShowMessageOptions(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="space-y-2">
            {/* Copy text */}
            {selectedMessage.text && (
              <button
                onClick={() => {
                  handleCopyMessage(selectedMessage.text);
                  setShowMessageOptions(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faCopy} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Copy Text</p>
                  <p className="text-xs text-gray-500">Copy message content to clipboard</p>
                </div>
              </button>
            )}

            {/* Reply */}
            <button
              onClick={() => {
                setReplyingTo({
                  id: selectedMessage.id,
                  text: selectedMessage.text || (selectedMessage.file ? '📎 File' : ''),
                  senderId: selectedMessage.senderId
                });
                setShowMessageOptions(false);
                messageInputRef.current?.focus();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
            >
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faReply} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Reply</p>
                <p className="text-xs text-gray-500">Reply to this message</p>
              </div>
            </button>

            {/* Pin/Unpin */}
            <button
              onClick={() => {
                handleTogglePin(selectedMessage.id);
                setShowMessageOptions(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
            >
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faThumbtack} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {isPinned ? 'Unpin Message' : 'Pin Message'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPinned ? 'Remove from pinned messages' : 'Pin for quick access'}
                </p>
              </div>
            </button>

            {/* Edit (own messages only) */}
            {isOwn && !selectedMessage.isAutoReply && (
              <button
                onClick={() => {
                  setEditingMessage(selectedMessage);
                  setEditText(selectedMessage.text || '');
                  setShowMessageOptions(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
              >
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faEdit} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Edit Message</p>
                  <p className="text-xs text-gray-500">Modify your message</p>
                </div>
              </button>
            )}

            {/* Delete (own messages only) */}
            {isOwn && !selectedMessage.isAutoReply && (
              <button
                onClick={() => {
                  handleDeleteMessage(selectedMessage.id);
                  setShowMessageOptions(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex items-center space-x-3 transition"
              >
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faTrash} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">Delete Message</p>
                  <p className="text-xs text-gray-500">Remove this message permanently</p>
                </div>
              </button>
            )}

            {/* File actions */}
            {selectedMessage.file && selectedMessage.file.data !== '[FILE]' && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                
                <button
                  onClick={() => {
                    handleDownloadFile(
                      selectedMessage.file.data,
                      selectedMessage.file.name,
                      selectedMessage.file.type,
                      selectedMessage.file.isCompressed
                    );
                    setShowMessageOptions(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
                >
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faDownload} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Download File</p>
                    <p className="text-xs text-gray-500">Save to your device</p>
                  </div>
                </button>

                {selectedMessage.file.type?.startsWith('image/') && (
                  <button
                    onClick={() => {
                      handleViewFile(
                        selectedMessage.file.data,
                        selectedMessage.file.type,
                        selectedMessage.file.isCompressed
                      );
                      setShowMessageOptions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
                  >
                    <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faEye} className="text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">View Image</p>
                      <p className="text-xs text-gray-500">Open in full size</p>
                    </div>
                  </button>
                )}

                {selectedMessage.file.type === 'application/pdf' && (
                  <button
                    onClick={() => {
                      handleViewFile(
                        selectedMessage.file.data,
                        selectedMessage.file.type,
                        selectedMessage.file.isCompressed
                      );
                      setShowMessageOptions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition"
                  >
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faFilePdf} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">View PDF</p>
                      <p className="text-xs text-gray-500">Open in new tab</p>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowMessageOptions(false)}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== CHAT INFO PANEL ====================

  const renderChatInfo = () => {
    const ownMessages = messages.filter(m => m.senderId === currentUser?.uid);
    const receivedMessages = messages.filter(m => m.senderId !== currentUser?.uid);
    const fileMessages = messages.filter(m => m.file);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
              Chat Information
            </h3>
            <button
              onClick={() => setShowChatInfo(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="space-y-6">
            {/* User info */}
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl">
  <div className="relative">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
      {otherUserProfileImage ? (
        <img 
          src={otherUserProfileImage} 
          alt={otherUserName} 
          className="w-full h-full object-cover"
        />
      ) : (
        otherUserName?.charAt(0) || 'U'
      )}
    </div>
    <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
      onlineStatus === 'online' ? 'bg-green-500' : 
      onlineStatus === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
    }`} />
  </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{otherUserName}</p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    otherUserRole === 'doctor' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {otherUserRole === 'doctor' ? 'Doctor' : 'Patient'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {onlineStatus === 'online' ? 'Online' : 
                     onlineStatus === 'away' ? 'Away' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-500" />
                Settings
              </h4>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isMuted ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                      <FontAwesomeIcon 
                        icon={isMuted ? faBellSlash : faBell} 
                        className={`${isMuted ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} 
                      />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-gray-700">
                    {isMuted ? '🔇' : '🔔'}
                  </span>
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      const unreadMessageIds = messages
                        .filter(m => m.senderId !== currentUser?.uid && !m.isRead)
                        .map(m => m.id);
                      
                      if (unreadMessageIds.length > 0 && chatId) {
                        await markMessagesAsRead(chatId, currentUser?.uid, unreadMessageIds);
                        setUnreadCount(0);
                        setMessages(prev => prev.map(m => 
                          m.senderId !== currentUser?.uid ? { ...m, isRead: true } : m
                        ));
                        toast.success('All messages marked as read');
                      }
                    }}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FontAwesomeIcon icon={faCheckDouble} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Mark all as read ({unreadCount})
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsFullScreen(!isFullScreen);
                    setShowChatInfo(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                  </span>
                </button>
              </div>
            </div>

            {/* Working hours */}
            {otherUserRole === 'doctor' && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-500" />
                  Working Hours
                </h4>
                
                <div className={`p-4 rounded-xl ${
                  isWithinWorkingHours 
                    ? 'bg-green-50 dark:bg-green-900/30' 
                    : 'bg-yellow-50 dark:bg-yellow-900/30'
                }`}>
                  <p className="text-sm flex items-center mb-2">
                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                    {workingHours.start}:00 - {workingHours.end}:00
                  </p>
                  <p className="text-xs">
                    {isWithinWorkingHours 
                      ? `${otherUserName} is currently available` 
                      : `${otherUserName} is currently unavailable`}
                  </p>
                  {autoReplySent && !isWithinWorkingHours && (
                    <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                      Auto-reply has been sent
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <FontAwesomeIcon icon={faChartBar} className="mr-2 text-gray-500" />
                Statistics
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {messages.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Messages</p>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {fileMessages.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Files Shared</p>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {ownMessages.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Sent</p>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl text-center">
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {receivedMessages.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Received</p>
                </div>
              </div>
            </div>

            {/* Pinned messages */}
            {pinnedMessages.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  onClick={() => setShowPinned(!showPinned)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                      <FontAwesomeIcon icon={faThumbtack} className="text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Pinned Messages ({pinnedMessages.length})
                    </span>
                  </div>
                  <FontAwesomeIcon icon={showPinned ? faChevronUp : faChevronDown} className="text-gray-500" />
                </button>
                
                {showPinned && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {pinnedMessages.map(id => {
                      const message = messages.find(m => m.id === id);
                      if (!message || message.isDeleted) return null;
                      return (
                        <div
                          key={id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                          onClick={() => {
                            scrollToMessage(id);
                            setShowPinned(false);
                            setShowChatInfo(false);
                          }}
                        >
                          <p className="truncate text-gray-900 dark:text-white">
                            {message.text || (message.file ? '📎 ' + message.file.name : 'Message')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {message.timestamp?.toDate 
                              ? formatDate(message.timestamp.toDate())
                              : formatDate(message.timestamp)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowChatInfo(false)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== EDIT MESSAGE BAR ====================

  const renderEditBar = () => {
    if (!editingMessage) return null;

    return (
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={faEdit} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Editing message
            </span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setEditText('');
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="mt-2 flex space-x-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
            placeholder="Edit your message..."
            autoFocus
          />
          <button
            onClick={handleEditMessage}
            disabled={!editText.trim()}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditingMessage(null);
              setEditText('');
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ==================== REPLY BAR ====================

  const renderReplyBar = () => {
    if (!replyingTo) return null;

    return (
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={faReply} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Replying to {replyingTo.senderId === currentUser?.uid ? 'yourself' : otherUserName}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 italic">
          {replyingTo.text || 'Message'}
        </div>
      </div>
    );
  };

  // ==================== ERROR STATE ====================

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Chat Error
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={initializeChat}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
      isFullScreen ? 'p-0' : 'p-4'
    }`}>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col ${
        isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl h-[600px]'
      }`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
  <div className="relative">
    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
      {otherUserProfileImage ? (
        <img 
          src={otherUserProfileImage} 
          alt={otherUserName} 
          className="w-full h-full object-cover"
        />
      ) : (
        otherUserName?.charAt(0) || 'U'
      )}
    </div>
    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
      onlineStatus === 'online' ? 'bg-green-400' : 
      onlineStatus === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
    }`} />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
        {unreadCount}
      </span>
    )}
  </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center">
                {otherUserName}
                {otherUserRole === 'doctor' && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    Doctor
                  </span>
                )}
              </h3>
              <p className="text-sm text-blue-100 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  onlineStatus === 'online' ? 'bg-green-400' : 
                  onlineStatus === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
                }`} />
                {onlineStatus === 'online' ? 'Online' : 
                 onlineStatus === 'away' ? 'Away' : 'Offline'}
                {typingStatus && (
                  <span className="ml-2 flex items-center">
                    <FontAwesomeIcon icon={faCircle} className="animate-pulse mr-1 h-1 w-1" />
                    <FontAwesomeIcon icon={faCircle} className="animate-pulse mr-1 h-1 w-1 delay-100" />
                    <FontAwesomeIcon icon={faCircle} className="animate-pulse h-1 w-1 delay-200" />
                  </span>
                )}
                {!isWithinWorkingHours && otherUserRole === 'doctor' && (
                  <span className="ml-2 text-yellow-200">(Away)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Connection status */}
            {connectionStatus === 'disconnected' && (
              <div className="mr-2 text-yellow-200" title="Reconnecting...">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              </div>
            )}

            {/* Search button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition ${
                showSearch ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title="Search messages (Ctrl+F)"
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>

            {/* Info button */}
            <button
              onClick={() => setShowChatInfo(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="Chat information"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
            </button>

            {/* Full screen button */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title={isFullScreen ? 'Exit full screen' : 'Full screen'}
            >
              <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="Close chat"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search in messages..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentSearchIndex + 1}/{searchResults.length}
                  </span>
                  <button
                    onClick={() => navigateSearch('prev')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                    disabled={searchResults.length === 0}
                  >
                    <FontAwesomeIcon icon={faChevronUp} />
                  </button>
                  <button
                    onClick={() => navigateSearch('next')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                    disabled={searchResults.length === 0}
                  >
                    <FontAwesomeIcon icon={faChevronDown} />
                  </button>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSearchResults([]);
                      setCurrentSearchIndex(-1);
                    }}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto p-6 space-y-4 ${
            loading ? 'flex items-center justify-center' : ''
          }`}
          style={{
            backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(0,0,0,0.02) 2px, transparent 2px)',
            backgroundSize: '30px 30px'
          }}
          onScroll={(e) => {
            // Load more messages when scrolling to top
            if (e.target.scrollTop < 100 && hasMore && !loadingMore) {
              loadMoreMessages();
            }
          }}
        >
          {loading ? (
            <div className="text-center">
              <div className="relative">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-4xl mb-3" />
                <div className="absolute inset-0 animate-ping">
                  <FontAwesomeIcon icon={faCircle} className="text-blue-400 text-4xl opacity-20" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faPaperPlane} className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No messages found' : 'No messages yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
                {searchTerm 
                  ? 'Try different search terms'
                  : 'Send a message to start the conversation'
                }
              </p>
              {!isWithinWorkingHours && otherUserRole === 'doctor' && !searchTerm && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl max-w-sm">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                    <FontAwesomeIcon icon={faClock} className="mr-2 flex-shrink-0" />
                    Doctor is currently outside working hours. They may not respond immediately.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {loadingMore && (
                <div className="text-center py-2">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600" />
                </div>
              )}
              {filteredMessages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Working hours warning for patients */}
        {userRole === 'patient' && !isWithinWorkingHours && otherUserRole === 'doctor' && !autoReplySent && messages.length > 0 && (
          <div className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
            <p className="text-sm flex items-center justify-center">
              <FontAwesomeIcon icon={faClock} className="mr-2 animate-pulse" />
              Doctor's working hours: {workingHours.start}:00 - {workingHours.end}:00. 
              Auto-reply will be sent if they don't respond.
            </p>
          </div>
        )}

        {/* Edit bar */}
        {renderEditBar()}

        {/* Reply bar */}
        {renderReplyBar()}

        {/* Attachment Preview */}
        {attachment && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {attachmentPreview ? (
                  <div className="relative">
                    <img 
                      src={attachmentPreview} 
                      alt="Preview" 
                      className="h-16 w-16 object-cover rounded-lg" 
                    />
                    <button
                      onClick={() => {
                        setAttachment(null);
                        setAttachmentPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600 transition shadow-lg"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FontAwesomeIcon icon={getFileIcon(attachment.type)} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{attachment.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setAttachment(null);
                        setAttachmentPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                      title="Remove attachment"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={messageInputRef}
                value={editingMessage ? editText : newMessage}
                onChange={(e) => {
                  if (editingMessage) {
                    setEditText(e.target.value);
                  } else {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage 
                  ? "Edit your message..." 
                  : (userRole === 'patient' && !isWithinWorkingHours && otherUserRole === 'doctor'
                    ? "Message (doctor may not respond until working hours)..."
                    : "Type your message... (Enter to send, Shift+Enter for new line)")}
                rows="1"
                className="w-full px-4 py-3 pr-32 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none transition-all"
                style={{ 
                  minHeight: '48px', 
                  maxHeight: '150px',
                }}
                disabled={sending}
                maxLength={2000}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                {/* Character counter */}
                {(editingMessage ? editText : newMessage).length > 0 && (
                  <div className={`px-2 py-1 text-xs rounded ${
                    (editingMessage ? editText : newMessage).length > 1800 
                      ? 'text-red-600 bg-red-100 dark:bg-red-900/30' 
                      : (editingMessage ? editText : newMessage).length > 1500
                      ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
                      : 'text-gray-500'
                  }`}>
                    {(editingMessage ? editText : newMessage).length}/2000
                  </div>
                )}
                
                {/* Emoji picker button - only show when not editing */}
                {!editingMessage && (
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-50 relative group"
                    disabled={sending}
                    title="Add emoji"
                  >
                    <FontAwesomeIcon icon={faSmile} />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                      Add emoji
                    </span>
                  </button>
                )}
                
                {/* Attachment button - only show when not editing */}
                {!editingMessage && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-50 relative group"
                    disabled={sending}
                    title="Attach file (max 10MB)"
                  >
                    <FontAwesomeIcon icon={faPaperclip} />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                      Attach file
                    </span>
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.mp3,.wav,.ogg,.mp4,.webm"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={sending || editingMessage}
                />
              </div>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && !editingMessage && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <div className="relative shadow-2xl rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowEmojiPicker(false)}
                      className="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title="Close emoji picker"
                    >
                      <FontAwesomeIcon icon={faTimes} size="sm" />
                    </button>
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        setNewMessage(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                        messageInputRef.current?.focus();
                      }}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                      searchDisabled={false}
                      skinTonesDisabled={false}
                      height={400}
                      width={350}
                      previewConfig={{
                        showPreview: true
                      }}
                      lazyLoadEmojis={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Send/Save button */}
            <button
              onClick={editingMessage ? handleEditMessage : handleSendMessage}
              disabled={
                editingMessage 
                  ? !editText.trim() || sending
                  : sending || (!newMessage.trim() && !attachment)
              }
              className={`px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px] flex items-center justify-center group relative shadow-lg ${
                editingMessage
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
              title={editingMessage ? 'Save changes' : 'Send message'}
            >
              {sending ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                <>
                  <FontAwesomeIcon 
                    icon={editingMessage ? faCheckCircle : faPaperPlane} 
                    className={editingMessage ? '' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'} 
                  />
                  <span className="ml-2 hidden sm:inline">
                    {editingMessage ? 'Save' : 'Send'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Message length warning */}
          {(editingMessage ? editText : newMessage).length > 1800 && (editingMessage ? editText : newMessage).length <= 2000 && (
            <p className="text-xs text-red-600 dark:text-red-500 mt-2 flex items-center font-semibold animate-pulse">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
              Message is near the limit ({(editingMessage ? editText : newMessage).length}/2000). Consider sending now.
            </p>
          )}

          {/* Message limit reached warning */}
          {(editingMessage ? editText : newMessage).length > 2000 && (
            <p className="text-xs text-red-600 dark:text-red-500 mt-2 flex items-center font-bold">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
              Message limit reached (2000 characters). Please shorten your message.
            </p>
          )}

          {/* Typing indicator */}
          {typingStatus && !sending && !editingMessage && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic flex items-center">
              <span className="animate-pulse mr-1">•</span>
              <span className="animate-pulse mr-1 delay-100">•</span>
              <span className="animate-pulse mr-2 delay-200">•</span>
              {otherUserName} is typing...
            </p>
          )}

          {/* Keyboard shortcuts hint */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd> to send · 
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs ml-1">Shift+Enter</kbd> new line · 
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs ml-1">Ctrl+F</kbd> search · 
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs ml-1">Esc</kbd> cancel
          </p>
        </div>
      </div>

      {/* Message Options Modal */}
      {renderMessageOptions()}

      {/* Chat Info Modal */}
      {showChatInfo && renderChatInfo()}
    </div>
  );
};

export default Chat;
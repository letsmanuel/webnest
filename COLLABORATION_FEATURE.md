# Real-Time Collaboration Feature

## Overview

The Webnest platform now supports real-time collaborative website editing, allowing multiple users to work on the same website simultaneously. This feature enables teams to collaborate efficiently on website development projects.

## Features

### Session Management
- **Session Creation**: Website owners can start collaboration sessions with 2-5 participants
- **PIN-based Access**: Each session generates a unique 6-character PIN for secure access
- **Token-based Pricing**: Sessions cost tokens based on the number of participants
- **Automatic Cleanup**: Inactive sessions are automatically cleaned up after 30 minutes

### Real-Time Synchronization
- **Live Updates**: All changes are instantly synchronized between participants
- **Element Operations**: Add, update, delete, and reorder elements in real-time
- **Visual Feedback**: Participants can see who is currently editing
- **Conflict Resolution**: Changes are applied in order of receipt

### User Interface
- **Collaboration Button**: Available in the WebsiteBuilder toolbar
- **Join Session Dialog**: Accessible from the Dashboard
- **Participant Panel**: Shows active participants and their status
- **Session Status**: Real-time display of session information

## Token Costs

| Participants | Token Cost |
|--------------|------------|
| 2            | 20 Tokens  |
| 3            | 30 Tokens  |
| 4            | 40 Tokens  |
| 5            | 50 Tokens  |

**Note**: Tokens are deducted per session and are not refunded when the session ends.

## How to Use

### Starting a Collaboration Session

1. **Navigate to Website**: Go to your dashboard and select a website to edit
2. **Click Collaborate**: Click the "Kollaborieren" button in the WebsiteBuilder toolbar
3. **Configure Session**: Choose the number of participants (2-5)
4. **Start Session**: Confirm the token cost and start the session
5. **Share PIN**: Share the generated 6-character PIN with your collaborators

### Joining a Collaboration Session

1. **Access Dashboard**: Go to your dashboard
2. **Click Join Session**: Click "Entwicklungssession beitreten"
3. **Enter PIN**: Enter the 6-character PIN provided by the session owner
4. **Join Session**: Click "Session beitreten" to join the collaborative editor

### During Collaboration

- **Real-Time Editing**: All participants can edit the website simultaneously
- **Live Synchronization**: Changes appear instantly for all participants
- **Participant View**: Click "Teilnehmer" to see who is currently active
- **Save Changes**: Use the save button to persist changes to the database
- **Leave Session**: Close the browser or click the back button to leave

## Technical Implementation

### Database Collections

#### `collaboration_sessions`
Stores active collaboration sessions:
```typescript
{
  id: string;
  websiteId: string;
  ownerId: string;
  pin: string;
  maxParticipants: number;
  currentParticipants: number;
  participants: Array<{
    userId: string;
    displayName: string;
    joinedAt: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}
```

#### `collaboration_messages`
Stores real-time collaboration messages:
```typescript
{
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  type: 'element_add' | 'element_update' | 'element_delete' | 'element_reorder' | 'cursor_move' | 'chat';
  data: any;
  timestamp: Date;
}
```

### Key Components

#### `CollaborationService`
- Manages session creation, joining, and leaving
- Handles real-time message broadcasting
- Implements token deduction and validation
- Provides session cleanup functionality

#### `CollaborationDialog`
- UI for starting new collaboration sessions
- Session configuration (participant count, token costs)
- PIN generation and sharing

#### `JoinSessionDialog`
- UI for joining existing sessions
- PIN input and validation
- Error handling for invalid/full sessions

#### `CollaborativeWebsiteBuilder`
- Extended WebsiteBuilder with real-time capabilities
- Handles message synchronization
- Manages participant state and UI
- Provides collaborative editing interface

### Real-Time Communication

The system uses Firebase Firestore's real-time listeners to synchronize changes:

1. **Message Broadcasting**: When a user makes a change, a message is sent to the `collaboration_messages` collection
2. **Real-Time Listening**: All participants listen to messages for their session
3. **Change Application**: Messages are processed and applied to the local state
4. **UI Updates**: The interface updates to reflect the changes

### Security Features

- **PIN-based Access**: 6-character alphanumeric PINs for session access
- **Owner Validation**: Only website owners can start collaboration sessions
- **Participant Limits**: Sessions have configurable participant limits
- **Automatic Cleanup**: Inactive sessions are automatically removed
- **Token Validation**: Users must have sufficient tokens to start sessions

## Error Handling

### Common Scenarios

1. **Insufficient Tokens**: Users cannot start sessions without enough tokens
2. **Session Full**: Users cannot join sessions that have reached capacity
3. **Invalid PIN**: Users cannot join sessions with incorrect PINs
4. **Session Ended**: Users are notified when sessions are terminated
5. **Network Issues**: Real-time updates are resilient to temporary disconnections

### User Feedback

- **Toast Notifications**: Clear feedback for all actions and errors
- **Loading States**: Visual indicators during session operations
- **Status Messages**: Real-time status updates in the collaboration interface
- **Error Recovery**: Graceful handling of connection issues

## Future Enhancements

### Planned Features

1. **Chat System**: In-session messaging between participants
2. **Cursor Tracking**: Visual indicators showing where other users are editing
3. **Version History**: Track changes and allow rollbacks
4. **Permission Levels**: Different access levels for participants
5. **Session Recording**: Record collaboration sessions for review
6. **Advanced Conflict Resolution**: Better handling of simultaneous edits

### Performance Optimizations

1. **Message Batching**: Group multiple changes into single messages
2. **Selective Updates**: Only sync changed elements
3. **Connection Management**: Better handling of network interruptions
4. **Memory Optimization**: Efficient handling of large websites

## Troubleshooting

### Common Issues

1. **Session Not Found**: Verify the PIN is correct and the session is still active
2. **Changes Not Syncing**: Check your internet connection and refresh the page
3. **Cannot Join Session**: Ensure the session has available slots
4. **Tokens Not Deducted**: Contact support if tokens are not properly deducted

### Support

For issues with the collaboration feature, please check:
1. Your internet connection
2. Your token balance
3. The session PIN accuracy
4. Whether the session is still active

If problems persist, contact the support team with:
- Session PIN (if applicable)
- Error messages
- Steps to reproduce the issue
- Browser and device information 
# Single-Cycle Time Tracking System

## Overview
Updated the time tracking system to allow **only ONE time in and ONE time out** per student. Once a student completes their entry/exit cycle, they cannot scan again.

## How It Works

### **Scan 1: Time In** ✅
- Student scans barcode for the first time
- Status: 🟢 **"Inside"**
- Records: `time_in = current timestamp`
- Action available: "Time Out"

### **Scan 2: Time Out** ❌
- Student scans barcode for the second time
- Status: 🔵 **"Completed"**
- Records: `time_out = current timestamp`
- Calculates: `total_time_spent = time_out - time_in`
- **No further scanning allowed**

### **Scan 3+: Blocked** 🚫
- Any additional scans are rejected
- Error message: "Student has already completed their entry/exit cycle!"
- Status remains: 🔵 **"Completed"**

## Visual Example

```
👤 John Doe - First scan at 2:00 PM
   ✅ TIME IN: 2:00 PM
   📍 Status: INSIDE
   🎯 Action: Can scan to "Time Out"

👤 John Doe - Second scan at 4:00 PM  
   ❌ TIME OUT: 4:00 PM
   📍 Status: COMPLETED
   ⏱️ Total Time: 2h 0m
   🚫 Action: No further scanning allowed

👤 John Doe - Third scan attempt at 6:00 PM
   🚫 BLOCKED: "Already completed entry/exit cycle!"
   📍 Status: COMPLETED (unchanged)
   ⏱️ Total Time: 2h 0m (unchanged)
```

## Dashboard Statistics

### **Updated Status Categories:**
1. **🟢 Currently Inside** - Students who scanned in but haven't scanned out yet
2. **🔵 Completed Cycles** - Students who completed both time in and time out
3. **🔴 Never Entered** - Students who never scanned at all

### **Status Badges:**
- 🟢 **"Inside"** - Student is currently in the venue (can still time out)
- 🔵 **"Completed"** - Student finished their full cycle (no more scanning)
- 🔴 **"Not Entered"** - Student never scanned (can still time in)

## User Interface Changes

### **Check-in Page:**
- **Active students** (Never Entered/Inside): Show "Time In" or "Time Out" button
- **Completed students**: Show "Cycle Complete" (grayed out, no button)
- **Error handling**: Clear message when trying to scan completed students

### **Manual Check-in Table:**
```
┌──────────────┬─────────────┬─────────────┬──────────────┬─────────────┐
│ Name         │ Status      │ Time In/Out │ Session Time │ Action      │
├──────────────┼─────────────┼─────────────┼──────────────┼─────────────┤
│ John Doe     │ 🟢 Inside   │ In: 2:00 PM │ 1h 45m       │ [Time Out]  │
│ Jane Smith   │ 🔵 Complete │ In: 6:00 PM │ 1h 30m       │ Cycle       │
│              │             │ Out: 7:30PM │              │ Complete    │
│ Bob Wilson   │ 🔴 Not Ent. │ -           │ -            │ [Time In]   │
└──────────────┴─────────────┴─────────────┴──────────────┴─────────────┘
```

## Technical Implementation

### **Backend Logic:**
```typescript
// In toggleStudentTimeStatus()
switch (student.current_status) {
  case 'NEVER_ENTERED':
    return await timeInStudent(id);  // Allow first scan
  case 'IN':
    return await timeOutStudent(id); // Allow second scan
  case 'OUT':
    return { ...student, error: 'ALREADY_COMPLETED' }; // Block further scans
}
```

### **Frontend Handling:**
- Check status before allowing scan
- Show appropriate error messages
- Disable buttons for completed students
- Update UI to reflect final state

## Benefits

### **1. Simplified Workflow**
- Clear start and end for each student
- No confusion about multiple entries
- Easy to understand for staff

### **2. Accurate Analytics**
- Each student has exactly one time duration
- No complex calculations for multiple sessions
- Clean data for reporting

### **3. Event Management**
- Know exactly who completed their visit
- Track total participation accurately
- Prevent accidental re-scanning

### **4. User Experience**
- Clear visual feedback on completion
- No unexpected behavior from multiple scans
- Intuitive single-cycle flow

## Use Cases

### **Perfect For:**
- **Single-session events** (workshops, presentations, exams)
- **Entry/exit tracking** (building access, event attendance)
- **Time-limited activities** (study sessions, lab time)
- **Simple attendance** (meetings, classes)

### **Not Suitable For:**
- Multi-day events with daily entry/exit
- Events with lunch breaks requiring re-entry
- Flexible come-and-go activities
- Multiple session tracking

## Migration from Multi-Cycle

### **Existing Data:**
- Students with status "OUT" are now considered "Completed"
- No changes needed to existing database records
- New scans will be blocked for completed students

### **Staff Training:**
- Explain the single-cycle concept
- Show the "Cycle Complete" status
- Demonstrate error handling for completed students

## Future Considerations

### **If Multi-Cycle Needed Later:**
- Add a "Reset Cycle" admin function
- Implement daily/event-based cycle resets
- Add configuration option for single vs. multi-cycle mode

### **Potential Enhancements:**
- Admin override to reset completed students
- Bulk reset functionality for new events
- Configurable cycle limits (1, 2, 3, unlimited)

This single-cycle system provides a clean, predictable time tracking experience perfect for most event scenarios while maintaining data integrity and user clarity.

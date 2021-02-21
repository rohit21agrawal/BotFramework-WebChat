```
     _                         _ _     _ _ _ _
    / \   ___ ___ ___  ___ ___(_) |__ (_) (_) |_ _   _
   / _ \ / __/ __/ _ \/ __/ __| | '_ \| | | | __| | | |
  / ___ \ (_| (_|  __/\__ \__ \ | |_) | | | | |_| |_| |
 /_/   \_\___\___\___||___/___/_|_.__/|_|_|_|\__|\__, |
                                                 |___/
```

<!--
Standard by Glenn Chappell & Ian Chai 3/93 -- based on Frank's .sig
Includes ISO Latin-1
figlet release 2.1 -- 12 Aug 1994
Modified for figlet 2.2 by John Cowan <cowan@ccil.org>
  to add Latin-{2,3,4,5} support (Unicode U+0100-017F).
Permission is hereby given to modify this font, as long as the
modifier's name is placed on a comment line.

Modified by Paul Burton  12/96 to include new parameter
supported by FIGlet and FIGWin.  May also be slightly modified for better use
of new full-width/kern/smush alternatives, but default output is NOT changed.

Font modified May 20, 2012 by patorjk to add the 0xCA0 character
-->

# Focus management

## Definitions

### Focusable

-  Interactive UI element that can be focused programmatically or via user gesture other than the <kbd>TAB</kbd> key, e.g. tap or mouse click
-  It is optional to allow <kbd>TAB</kbd> key to focus on this element

### Tabbable

-  A [focusable](#focusable) element which can be focused on by pressing <kbd>TAB</kbd> key

## UX: A series of decisions

> This is related to https://github.com/microsoft/BotFramework-WebChat/issues/3135.

### User story

The bot sends a question with a set of predefined answers as UI buttons that will drive the conversation towards a particular goal (a.k.a. decision buttons).

After the user makes their decision by clicking on a button, the decision is submitted. The user is not allowed to reselect another decision.

The bot will then send another question with another set of answers.

### Positive user experience

Once the user makes their selection, we should disable the decision buttons. Since the next question and set of possible decisions do not arrive immediately from the bot, we can not change the focus asynchronously outside of user gestures. Consequently, the user is required to press <kbd>TAB</kbd> to move the focus to the next set of decision buttons.

When the user presses the <kbd>TAB</kbd> key to move the focus from the current button to the next set of buttons, all the previous decision buttons should be disabled including the button the user chose. This will give a more consistent UX on how buttons are disabled.

Since disabling buttons will also hide them from screen reader, we should add a screen reader-only text to tell the user which answer they chose.

### Exceptions

-  If there is not a tabbable UI after the current disabled button, the next <kbd>TAB</kbd> should move the focus to the send box.

### Implementation

When a UI element is being disabled:

-  All UI will be manually styled, based on `:disabled, [aria-disabled="true"]` query
   -  User agent stylesheet do not take account into `aria-disabled` attribute
-  Set `aria-disabled` attribute to `true`
   -  If the element is a `<button>`, `onClick` is set to a handler that calls `event.preventDefault()`
   -  If the element is an `<input type="text">` or `<textarea>`, `readOnly` is set to `true`
-  If the element is currently focused, the component will wait until the `onBlur` event is called to set the `disabled` attribute to `true`
   -  Otherwise, the `disabled` attribute will be set to `true` immediately

> List of elements support `disabled` attribute can be found in [this article](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled).

### Additional context

By default, HTML is static. Thus, the default `disabled` implementation works on a static web page.

On a dynamic web page, when `disabled` is being applied to a focusing element (`document.activeElement`), the focus change varies between browsers:

| Browser                | Element referenced by `document.activeElement`  | Element styled by `:focus` pseudo-class            | Element to focus after pressing <kbd>TAB</kbd>                    |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Chrome/Edge (Chromium) | Become `document.body`                          | No elements are styled                             | Next tabbable sibling or descendants of them (depth-first search) |
| Edge (Legacy)          | Become `document.body`                          | No elements are styled unless `<body>` is tabbable | First tabbable descendants of `<body>`                            |
| Firefox/Safari         | Kept on the disabled element                    | Styles kept on the disabled element                | Next tabbable sibling or descendants of them (depth-first search) |
| Internet Explorer 11   | Become parent container of the disabled element | Parent container of the disabled element           | First tabbable descendants of parent container                    |

> On macOS Safari, <kbd>OPTION</kbd> + <kbd>TAB</kbd> is used to move focus between tabbable elements.

> On Firefox and macOS Safari, although disabled button appears to be focusable, they cannot be focused through <kbd>TAB</kbd> or JavaScript code.

## UX: New messages button

> This is related to [#3136](https://github.com/microsoft/BotFramework-WebChat/issues/3136).

### User story

When the user scrolls up to view past conversation and the bot sends a message with new decision buttons to the user, Web Chat places a "New messages" button on the screen to make the user aware of the new message.

The user should be able to move the focus to the "New messages" button by pressing <kbd>TAB</kbd>. Clicking on it will scroll the view to the first decision button and put the focus on it.

### Exceptions

If the new message does not contain any tabbable UI, it should move the focus to the send box after clicking on the "New messages" button.

### Implementation

The "New messages" button should be positioned in the DOM between the last read message and the first unread message.

When the "New messages" button is clicked:

-  Find the first message with a tabbable UI self or descendant
-  If a [tabbable](#tabbable) UI is found, focus on it
   -  Otherwise, focus on the send box wihout soft keyboard

### ARIA role "separator"

We are using the [ARIA role "separator"](https://www.w3.org/TR/wai-aria-1.1/#separator) for the "New messages" button. This is because the button serves as a visible boundary between read and unread messages, similar to a [horizontal ruler](https://www.w3.org/TR/html52/grouping-content.html#the-hr-element). Per [HTML 5.2 specifications](https://www.w3.org/TR/html52/grouping-content.html#the-li-element), the separator role is allowed to be used in the `<li>` element.

The separator role has a property called [children presentational](https://www.w3.org/TR/wai-aria-1.1/#childrenArePresentational). This property hides all children from assistive technology. Its effect is very similar to setting `role="presentation"` to all descendants and is not overrideable. Thus, it prevented us from using `<button>` widget inside the `<li role="separator">` element.

Fortunately, the separator role has two modes of operation: static structure or focusable widget. The "New messages" button is using the latter mode, which supports interactivity and movement.

When the "New messages" separator is activated, it logically moves the separator to the bottom of the page, thus, marking all messages as read. And we only support one direction and one amount of movement.

Lastly, we style the "New messages" separator like a normal button, styled it to float on top of the transcript, and added `click` and `keypress` event listener for <kbd>ENTER</kbd> and <kbd>SPACEBAR</kbd> key for [activation](https://www.w3.org/TR/wai-aria-practices-1.1/#button).

## Do and don't

### Do

-  After an element is removed from tab order, put the focus on next logical tabbable element
   -  "New messages" button
      -  After clicking on the "New messages" button, the focus should move to the first tabbable element of all the unread activities or the send box as last resort
      -  Related to [#3136](https://github.com/microsoft/BotFramework-WebChat/issues/3136)
   -  Suggested actions buttons
      -  After clicking on any suggested action buttons, the focus should move to the send box without soft keyboard
      -  For better UX, the activity asking the question should have the answer inlined
      -  Related to [#XXX](https://github.com/microsoft/BotFramework-WebChat/issues/XXX)

### Don't

-  Don't use numbers other than `0` or `-1` in `tabindex` attribute
   -  This will pollute the hosting environment
-  In an activity with question and answers, after clicking on a decision button, don't disable the button
   -  When the user reads the activity, the screen reader will only read the question but not the chosen answer
   -  It is okay to disable buttons that were not chosen as answer
   -  It is okay to disable all buttons, as long as the answer will be read by the screen reader
   -  Related to [#3135](https://github.com/microsoft/BotFramework-WebChat/issues/3135)
-  Don't move focus when an activity arrives (or asynchronously)
   -  Screen reader reading will be interrupted when focus change
   -  Only change focus synchronous to user gesture
   -  Related to [#3135](https://github.com/microsoft/BotFramework-WebChat/issues/3135)

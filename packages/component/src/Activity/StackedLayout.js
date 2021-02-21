/* eslint complexity: ["error", 30] */
/* eslint react/no-array-index-key: "off" */

import { css } from 'glamor';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import remarkStripMarkdown from '../Utils/remarkStripMarkdown';

import Bubble from './Bubble';
import connectToWebChat from '../connectToWebChat';
import ScreenReaderText from '../ScreenReaderText';
import textFormatToContentType from '../Utils/textFormatToContentType';
import useAvatarForBot from '../hooks/useAvatarForBot';
import useAvatarForUser from '../hooks/useAvatarForUser';
import useDateFormatter from '../hooks/useDateFormatter';
import useDirection from '../hooks/useDirection';
import useLocalizer from '../hooks/useLocalizer';
import useRenderActivityStatus from '../hooks/useRenderActivityStatus';
import useRenderAvatar from '../hooks/useRenderAvatar';
import useStyleOptions from '../hooks/useStyleOptions';
import useStyleSet from '../hooks/useStyleSet';
import useUniqueId from '../hooks/internal/useUniqueId';

const ROOT_CSS = css({
  display: 'flex',
  position: 'relative', // This is to keep screen reader text in the destinated area.

  '& > .webchat__stackedLayout__avatar': {
    flexShrink: 0
  },

  '& > .webchat__stackedLayout__content': {
    flexGrow: 1,
    overflow: 'hidden',

    '& > .webchat__row': {
      display: 'flex',

      '& > .bubble, & > .timestamp': {
        flexGrow: 1,
        overflow: 'hidden'
      },

      '& > .filler': {
        flexGrow: 10000,
        flexShrink: 1
      }
    }
  },

  '& > .filler': {
    flexShrink: 0
  },

  '&.webchat__stackedLayout--fromUser': {
    flexDirection: 'row-reverse',

    '& > .webchat__stackedLayout__content > .webchat__row': {
      flexDirection: 'row-reverse'
    }
  }
});

const connectStackedLayout = (...selectors) =>
  connectToWebChat(
    (
      {
        language,
        styleSet: {
          options: { botAvatarInitials, userAvatarInitials }
        }
      },
      { activity: { from: { role } = {} } = {} }
    ) => ({
      avatarInitials: role === 'user' ? userAvatarInitials : botAvatarInitials,
      language,

      // TODO: [P4] We want to deprecate botAvatarInitials/userAvatarInitials because they are not as helpful as avatarInitials
      botAvatarInitials,
      userAvatarInitials
    }),
    ...selectors
  );

const StackedLayout = ({ activity, children, nextVisibleActivity }) => {
  const [{ initials: botInitials }] = useAvatarForBot();
  const [{ initials: userInitials }] = useAvatarForUser();
  const [{ bubbleNubSize, bubbleFromUserNubSize }] = useStyleOptions();
  const [{ stackedLayout: stackedLayoutStyleSet }] = useStyleSet();
  const [direction] = useDirection();
  const contentARIALabelId = useUniqueId('webchat__stacked-layout__content');
  const formatDate = useDateFormatter();
  const localize = useLocalizer();
  const renderActivityStatus = useRenderActivityStatus({ activity, nextVisibleActivity });
  const renderAvatar = useRenderAvatar({ activity });

  const {
    attachments = [],
    channelData: { messageBack: { displayText: messageBackDisplayText } = {} } = {},
    from: { role } = {},
    text,
    textFormat,
    timestamp
  } = activity;

  const activityDisplayText = messageBackDisplayText || text;
  const fromUser = role === 'user';

  const indented = fromUser ? bubbleFromUserNubSize : bubbleNubSize;
  const initials = fromUser ? userInitials : botInitials;
  const plainText = useMemo(() => remarkStripMarkdown(text), [text]);
  const roleLabel = localize(fromUser ? 'CAROUSEL_ATTACHMENTS_USER_ALT' : 'CAROUSEL_ATTACHMENTS_BOT_ALT');

  const contentARIALabel = localize(
    fromUser ? 'ACTIVITY_USER_SAID' : 'ACTIVITY_BOT_SAID',
    initials,
    plainText.replace(/[.\s]+$/u, ''),
    formatDate(timestamp)
  ).trim();

  return (
    <div
      aria-labelledby={contentARIALabelId}
      className={classNames(
        ROOT_CSS + '',
        stackedLayoutStyleSet + '',
        direction === 'rtl' ? 'webchat__stackedLayout--rtl' : '',
        {
          'webchat__stackedLayout--fromUser': fromUser,
          webchat__stacked_extra_left_indent:
            (direction !== 'rtl' && fromUser && !renderAvatar && bubbleNubSize) ||
            (direction === 'rtl' && !fromUser && !renderAvatar && bubbleFromUserNubSize),
          webchat__stacked_extra_right_indent:
            (direction !== 'rtl' && !fromUser && !renderAvatar && bubbleFromUserNubSize) ||
            (direction === 'rtl' && fromUser && !renderAvatar && bubbleNubSize),
          webchat__stacked_indented_content: renderAvatar && !indented,
          'webchat__stackedLayout--hasAvatar': renderAvatar && !!(fromUser ? bubbleFromUserNubSize : bubbleNubSize)
        }
      )}
      role="group"
    >
      <ScreenReaderText id={contentARIALabelId} text={contentARIALabel} />
      {renderAvatar && <div className="webchat__stackedLayout__avatar">{renderAvatar()}</div>}
      <div className="webchat__stackedLayout__content">
        {!!activityDisplayText && (
          <div aria-hidden={true} className="webchat__row message">
            <Bubble className="bubble" fromUser={fromUser} nub={!!indented}>
              {children({
                activity,
                attachment: {
                  content: activityDisplayText,
                  contentType: textFormatToContentType(textFormat)
                }
              })}
            </Bubble>
            <div className="filler" />
          </div>
        )}
        {attachments.map((attachment, index) => (
          <div
            className={classNames('webchat__row attachment', { webchat__stacked_item_indented: indented })}
            key={index}
          >
            <ScreenReaderText text={roleLabel} />
            <Bubble className="attachment bubble" fromUser={fromUser} key={index} nub={false}>
              {children({ attachment })}
            </Bubble>
          </div>
        ))}
        <div className={classNames('webchat__row', { webchat__stacked_item_indented: indented })}>
          {renderActivityStatus()}
          <div aria-hidden={true} className="filler" />
        </div>
      </div>
      <div aria-hidden={true} className="filler" />
    </div>
  );
};

StackedLayout.defaultProps = {
  children: undefined,
  nextVisibleActivity: undefined
};

StackedLayout.propTypes = {
  activity: PropTypes.shape({
    attachments: PropTypes.array,
    channelData: PropTypes.shape({
      messageBack: PropTypes.shape({
        displayText: PropTypes.string
      })
    }),
    from: PropTypes.shape({
      role: PropTypes.string.isRequired
    }).isRequired,
    text: PropTypes.string,
    textFormat: PropTypes.string,
    timestamp: PropTypes.string,
    type: PropTypes.string.isRequired
  }).isRequired,
  children: PropTypes.any,
  nextVisibleActivity: PropTypes.shape({
    from: PropTypes.shape({
      role: PropTypes.string.isRequired
    }).isRequired,
    timestamp: PropTypes.string
  })
};

export default StackedLayout;

export { connectStackedLayout };

/* eslint react/no-array-index-key: "off" */

import { css } from 'glamor';
import { Context as FilmContext } from 'react-film';
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
  MsOverflowStyle: 'none',
  overflowX: 'scroll',
  overflowY: 'hidden',
  position: 'relative', // This is to keep screen reader text in the destinated area.
  touchAction: 'manipulation',
  WebkitOverflowScrolling: 'touch',

  '&::-webkit-scrollbar': {
    display: 'none'
  },

  '& > .webchat__carouselFilmStrip__avatar': {
    flexShrink: 0
  },

  '& > .content': {
    flex: 1,

    '& > .message': {
      display: 'flex',

      '& > .bubble': {
        flexGrow: 1,
        overflow: 'hidden'
      },

      '& > .filler': {
        flexGrow: 10000,
        flexShrink: 1
      }
    },

    '& > ul': {
      display: 'flex',
      listStyleType: 'none',
      margin: 0,
      padding: 0,

      '& > li': {
        flex: 1
      }
    }
  }
});

const connectCarouselFilmStrip = (...selectors) =>
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
      language
    }),
    ...selectors
  );

const WebChatCarouselFilmStrip = ({
  activity,
  children,
  className,
  itemContainerRef,
  nextVisibleActivity,
  scrollableRef
}) => {
  const [{ bubbleNubSize, bubbleFromUserNubSize }] = useStyleOptions();
  const [{ carouselFilmStrip: carouselFilmStripStyleSet }] = useStyleSet();
  const [{ initials: botInitials }] = useAvatarForBot();
  const [{ initials: userInitials }] = useAvatarForUser();
  const [direction] = useDirection();
  const contentARIALabelId = useUniqueId('webchat__carousel-filmstrip__content');
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
  const plainText = useMemo(() => remarkStripMarkdown(activityDisplayText), [activityDisplayText]);
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
        carouselFilmStripStyleSet + '',
        className + '',
        {
          webchat__carousel_indented_content: initials && !indented,
          webchat__carousel_extra_right_indent: !userInitials && bubbleFromUserNubSize
        },
        direction === 'rtl' ? 'webchat__carousel--rtl' : ''
      )}
      ref={scrollableRef}
      role="group"
    >
      <ScreenReaderText id={contentARIALabelId} text={contentARIALabel} />
      {renderAvatar && <div className="webchat__carouselFilmStrip__avatar">{renderAvatar()}</div>}
      <div className="content">
        {!!activityDisplayText && (
          <div className="message">
            <Bubble aria-hidden={true} className="bubble" fromUser={fromUser} nub={true}>
              {children({
                activity,
                attachment: {
                  content: activityDisplayText,
                  contentType: textFormatToContentType(textFormat)
                }
              })}
            </Bubble>
            <div aria-hidden={true} className="filler" />
          </div>
        )}
        <ul className={classNames({ webchat__carousel__item_indented: indented })} ref={itemContainerRef}>
          {attachments.map((attachment, index) => (
            <li key={index}>
              <ScreenReaderText text={roleLabel} />
              <Bubble fromUser={fromUser} key={index} nub={false}>
                {children({ attachment })}
              </Bubble>
            </li>
          ))}
        </ul>
        <div className={classNames({ webchat__carousel__item_indented: indented })}>{renderActivityStatus()}</div>
      </div>
    </div>
  );
};

WebChatCarouselFilmStrip.defaultProps = {
  children: undefined,
  className: '',
  nextVisibleActivity: undefined
};

WebChatCarouselFilmStrip.propTypes = {
  activity: PropTypes.shape({
    attachments: PropTypes.array,
    channelData: PropTypes.shape({
      messageBack: PropTypes.shape({
        displayText: PropTypes.string
      }),
      state: PropTypes.string
    }),
    from: PropTypes.shape({
      role: PropTypes.string.isRequired
    }).isRequired,
    text: PropTypes.string,
    textFormat: PropTypes.string,
    timestamp: PropTypes.string
  }).isRequired,
  children: PropTypes.any,
  className: PropTypes.string,
  itemContainerRef: PropTypes.any.isRequired,
  nextVisibleActivity: PropTypes.shape({
    from: PropTypes.shape({
      role: PropTypes.string.isRequired
    }).isRequired,
    timestamp: PropTypes.string
  }),
  scrollableRef: PropTypes.any.isRequired
};

const CarouselFilmStrip = props => (
  <FilmContext.Consumer>
    {({ itemContainerRef, scrollableRef }) => (
      <WebChatCarouselFilmStrip itemContainerRef={itemContainerRef} scrollableRef={scrollableRef} {...props} />
    )}
  </FilmContext.Consumer>
);

export default CarouselFilmStrip;

export { connectCarouselFilmStrip };

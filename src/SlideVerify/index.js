'use strict'

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  StyleSheet,
  Text,
  View,
  Image,
  PanResponder,
  Animated,
  TouchableOpacity,
  Easing,
  ActivityIndicator
} from 'react-native'
import Feather from 'react-native-vector-icons/Feather'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { CachedImage } from 'react-native-cached-image'
import styles from './styles'

// local puzzle
const defaultPuzzle = {
  puzzle: require('../images/puzzle.jpg'),
  puzzlePiece: require('../images/puzzlePiece.png'),
  pieceOffsetX: 79,
  allowableOffsetError: 3
}

const generateSlidingStyles = (
  iconName,
  iconColor = 'white',
  buttonColor,
  borderColor = buttonColor,
  indicatorColor
) => ({
  icon: <Feather name={iconName} size={25} color={iconColor} />,
  buttonColor,
  borderColor,
  indicatorColor
})

const slidingStyles = {
  READY: generateSlidingStyles('arrow-right', '#5C6167', 'white', '#e4e7eb', '#e4e7eb'),
  MOVING: generateSlidingStyles('arrow-right', undefined, '#1991fa', undefined, '#d1e9fe'),
  VERIFY_PASS: generateSlidingStyles('check', undefined, '#52ccba', undefined, '#d2f4ef'),
  VERIFY_FAIL: generateSlidingStyles('x', undefined, '#f57a7a', undefined, '#fce1e1')
}

export default class SlideVerification extends Component {
  static propTypes = {
    useDefault: PropTypes.bool,
    imageSize: PropTypes.shape({
      puzzleWidth: PropTypes.number,
      puzzleHeight: PropTypes.number,
      puzzlePieceWidth: PropTypes.number
    }),
    displayType: PropTypes.string,
    slideTips: PropTypes.string,
    showRefresh: PropTypes.bool,
    puzzle: PropTypes.oneOfType([
      PropTypes.shape({
        uri: PropTypes.string
      }),
      PropTypes.number
    ]),
    puzzlePiece: PropTypes.oneOfType([
      PropTypes.shape({
        uri: PropTypes.string
      }),
      PropTypes.number
    ]),
    onVerifyPassed: PropTypes.func,
    onVerifyFailed: PropTypes.func,
    slideVerify: PropTypes.func,
    refresh: PropTypes.func
  }

  static defaultProps = {
    useDefault: false,
    imageSize: {
      puzzleWidth: 300,
      puzzleHeight: 150,
      puzzlePieceWidth: 50
    },
    displayType: 'triggered',
    showRefresh: false,
    slideTips: '向右滑动左侧箭头填充拼图',
    puzzle: null,
    puzzlePiece: null,
    onVerifyPassed: () => {},
    onVerifyFailed: () => {},
    slideVerify: () => {},
    refresh: () => {}
  }

  state = {
    offsetXAnim: new Animated.Value(0),
    slideStatus: slidingStyles.READY,
    moving: false,
    verifying: false,
    result: null,
    lastResult: null
  }

  componentWillMount() {
    this.panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: this.hanldeShouldBeResponder,
      onStartShouldSetPanResponderCapture: this.hanldeShouldBeResponder,
      onMoveShouldSetPanResponder: this.hanldeShouldBeResponder,
      onMoveShouldSetPanResponderCapture: this.hanldeShouldBeResponder,

      onPanResponderGrant: this.handlePanResponderGrant, // begin sliding
      onPanResponderMove: this.handlePanResponderMove(), // sliding
      onPanResponderRelease: this.handlePanResponderRelease // slide end
    })
  }

  hanldeShouldBeResponder = () => this.state.lastResult !== true && !this.state.moving

  handlePanResponderGrant = () =>
    this.setState({
      moving: true,
      result: null,
      slideStatus: slidingStyles.MOVING
    })

  // bind accumulated distance to offsetAnim.x
  handlePanResponderMove = () => {
    const { offsetXAnim } = this.state
    const { imageSize: { puzzleWidth, puzzlePieceWidth } } = this.props
    const maxMoving = puzzleWidth - puzzlePieceWidth

    return Animated.event([null, { dx: offsetXAnim }], {
      // limit sliding out of box
      listener: (event, gestureState) => {
        if (gestureState.dx < 0) {
          offsetXAnim.setValue(0)
        } else if (gestureState.dx > maxMoving) {
          offsetXAnim.setValue(maxMoving)
        }
      }
    })
  }

  handlePanResponderRelease = async (event, gestureState) => {
    const offset = gestureState.dx

    // handle local puzzle
    if (this.props.useDefault) {
      const { pieceOffsetX, allowableOffsetError } = defaultPuzzle
      const minOffsetX = pieceOffsetX - allowableOffsetError
      const maxOffsetX = pieceOffsetX + allowableOffsetError
      offset >= minOffsetX && offset <= maxOffsetX
        ? this.handleVerifyPassed()
        : this.handleVerifyFailed()
    } else {
      // invoke external verify
      const { slideVerify } = this.props
      if (slideVerify) {
        this.setState({ verifying: true })
        try {
          await slideVerify(offset)
          this.handleVerifyPassed()
        } catch (error) {
          this.handleVerifyFailed()
        }
        this.setState({ verifying: false })
      }
    }
  }

  handleVerifyPassed = () => {
    const { useDefault, onVerifyPassed } = this.props
    this.setState({
      moving: false,
      result: true,
      slideStatus: slidingStyles.VERIFY_PASS,
      lastResult: true
    })
    useDefault && onVerifyPassed && onVerifyPassed()
  }

  handleVerifyFailed = () => {
    const { useDefault, onVerifyFailed } = this.props

    this.setState({
      result: false,
      slideStatus: slidingStyles.VERIFY_FAIL
    })

    useDefault && onVerifyFailed && onVerifyFailed()

    Animated.timing(this.state.offsetXAnim, {
      toValue: 0,
      delay: 500,
      easing: Easing.linear
    }).start(() => {
      // back to initial status
      this.setState({
        slideStatus: slidingStyles.READY,
        moving: false,
        result: null,
        lastResult: false
      })
    })
  }

  render() {
    const {
      useDefault,
      imageSize: { puzzleWidth, puzzleHeight, puzzlePieceWidth },
      showRefresh,
      refresh,
      displayType,
      slideTips
    } = this.props

    let puzzle
    let puzzlePiece

    // image from local or external
    if (useDefault) {
      ({ puzzle, puzzlePiece } = this.state)
    } else {
      ({ puzzle, puzzlePiece } = this.props)
    }

    const {
      slideStatus, moving, verifying, result, lastResult, offsetXAnim
    } = this.state

    return (
      <View style={{ width: puzzleWidth }}>
        <View
          style={[
            styles.puzzleContainer,
            {
              height: puzzleHeight,
              opacity: displayType === 'triggered' ? (moving || lastResult === false ? 1 : 0) : 1
            },
            displayType === 'triggered'
              ? { ...StyleSheet.absoluteFillObject, top: -(puzzleHeight + 20) }
              : styles.puzzleContainerEmbedded
          ]}
        >
          {useDefault ? (
            <Image
              source={defaultPuzzle.puzzle}
              style={[StyleSheet.absoluteFill, { zIndex: 2 }, styles.image]}
              resizeMode="cover"
            />
          ) : (
            <CachedImage
              source={puzzle}
              style={[StyleSheet.absoluteFill, { zIndex: 2 }, styles.image]}
              resizeMode="cover"
            />
          )}
          <Animated.View
            style={[
              styles.absoluteFill,
              {
                zIndex: 3,
                transform: [
                  { translateX: offsetXAnim },
                  // without this line this Animation will not render on Android while working fine on iOS
                  { perspective: 1000 }
                ]
              }
            ]}
          >
            {useDefault ? (
              <Image
                source={defaultPuzzle.puzzlePiece}
                style={{ width: puzzlePieceWidth, height: puzzleHeight }}
                resizeMode="cover"
              />
            ) : (
              <CachedImage
                source={puzzlePiece}
                style={{ width: puzzlePieceWidth, height: puzzleHeight }}
                resizeMode="cover"
              />
            )}
          </Animated.View>
          {showRefresh && (
            <TouchableOpacity
              onPress={refresh}
              activeOpacity={0.7}
              style={styles.refresh}
              disabled={verifying}
            >
              <Ionicons name="ios-refresh" size={35} color="white" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.slideBox}>
          <Animated.View
            style={[
              styles.slideIndicator,
              {
                width: offsetXAnim,
                borderColor: slideStatus.borderColor,
                backgroundColor: slideStatus.indicatorColor
              }
            ]}
          />

          <Animated.View
            style={[
              styles.slider,
              {
                width: puzzlePieceWidth,
                backgroundColor: slideStatus.buttonColor,
                borderColor: slideStatus.borderColor,
                transform: [{ translateX: offsetXAnim }, { perspective: 1000 }]
              }
            ]}
            {...this.panResponder.panHandlers}
          >
            {verifying ? <ActivityIndicator color="white" /> : slideStatus.icon}
          </Animated.View>
          {!moving && result === null && <Text style={styles.slideTips}>{slideTips}</Text>}
        </View>
      </View>
    )
  }
}

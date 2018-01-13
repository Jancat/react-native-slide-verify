import { StyleSheet } from 'react-native'

export default StyleSheet.create({
  puzzleContainer: {
    width: '100%',
    elevation: 10, // elevation and backgroundColor create shadow on Android
    backgroundColor: 'ghostwhite',
    shadowOffset: { width: 5, height: 5 },
    shadowColor: 'grey',
    shadowOpacity: 0.8,
    shadowRadius: 5
  },
  puzzleContainerEmbedded: {
    marginBottom: 20
  },
  image: {
    width: '100%',
    height: '100%'
  },
  refresh: {
    position: 'absolute',
    right: 5,
    top: 1,
    zIndex: 3,
    backgroundColor: 'transparent'
  },
  slideBox: {
    width: '100%',
    height: 45,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    backgroundColor: '#f7f9fa'
  },
  slideIndicator: {
    height: '100%',
    borderWidth: 1,
    borderRightWidth: 0
  },
  slider: {
    height: 43,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  },
  slideTips: {
    position: 'absolute',
    left: '30%',
    top: 13
  }
})
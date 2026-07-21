import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

export default function CreateTabFallback() {
  useFocusEffect(
    useCallback(() => {
      router.push('/create-activity');
    }, [])
  );

  return <View />;
}

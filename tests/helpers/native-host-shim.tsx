/** Host surfaces only. Tests retain the real forms, workspace controller and API transport. */
import React from 'react';
export const View='View',Text='Text',TextInput='TextInput',Pressable='Pressable',ScrollView='ScrollView',Modal='Modal',KeyboardAvoidingView='KeyboardAvoidingView',Image='Image',Switch='Switch',ActivityIndicator='ActivityIndicator';
export const Platform={OS:'ios',select:(x:any)=>x.ios??x.default},StyleSheet={create:(x:any)=>x,absoluteFillObject:{},hairlineWidth:1},AppState={addEventListener:()=>({remove(){}})},Appearance={getColorScheme:()=> 'light',addChangeListener:()=>({remove(){}})};
export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const useTheme=()=>({colors:{button:'#087a36',onButton:'#fff',surface:'#fff',text:'#123',border:'#ddd',overlay:'#0008'},dark:false});
export const FieldCaption=({children}:any)=>React.createElement(Text,null,children);
export const fieldAccessibilityLabel=(label:string,required:boolean)=>label+(required?' (required)':'');
export const Card=({children}:any)=>React.createElement(View,null,children),Copy=({children}:any)=>React.createElement(Text,null,children),Title=Copy;
export const Button=({label,onPress,disabled}:any)=>React.createElement(Pressable,{accessibilityRole:'button',accessibilityLabel:label,onPress,disabled},React.createElement(Text,null,label));
export const EasyGasLoader=({label}:any)=>React.createElement(Text,null,label||'Loading');
export const randomUUID=()=>globalThis.crypto.randomUUID();
export const getItemAsync=async()=>null,setItemAsync=async()=>{},deleteItemAsync=async()=>{};
export const cacheDirectory='/unavailable-test-cache/',isAvailableAsync=async()=>false;
export const printToFileAsync=async()=>{throw Error('Native print requires device acceptance')},shareAsync=async()=>{throw Error('Native share requires device acceptance')},writeAsStringAsync=async()=>{},deleteAsync=async()=>{};

export const launchImageLibraryAsync=async()=>({canceled:true});

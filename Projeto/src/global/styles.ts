import { Dimensions, StyleSheet } from 'react-native';
import { themes } from './themes';

export const style = StyleSheet.create({

  textCenter: {
    alignItems: "center",
    flex: 1
  },


    //Header dashboard, relatórios e contra-notas 
    containerH: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themes.colors.verde,
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        gap: 12,
    },
    logoH: {
        width: 32,
        height: 32,
    },
    titleH: {
        color: themes.colors.branco,
        fontSize: 18,
        fontWeight: 'bold',
    },



    // Estilos para a página de login
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxTop: {
        height: Dimensions.get('window').height / 3,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxMid: {
        height: Dimensions.get('window').height / 4,
        width: '100%',
        paddingHorizontal: 37,
    },
    boxBottom: {
        height: Dimensions.get('window').height / 3,
        width: '100%',
        alignItems: 'center',
    },
    logo: {
        width: 200,
        height: 200,
    },
    text: {
        fontWeight: 'bold',
        marginTop: 20,
        fontSize: 15,
        color:themes.colors.preto,
    },
    titleinput: {
        fontWeight: 'bold',
        marginTop: 40,
        marginLeft: 5,
        color:themes.colors.preto,
    },
    placeholder: {
        height: 40,
        borderWidth: 1,
        borderColor: themes.colors.cinzaBorda,
        borderRadius: 50,
        paddingHorizontal: 10,
        marginTop: 10,
        color:themes.colors.preto,
    },
    button: {
        width: 250,
        height: 40,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 90,
        backgroundColor:themes.colors.verdeMedio,
        color:themes.colors.preto,
        borderColor:themes.colors.preto,
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    textbutton: {
        fontWeight: 'bold',
        color:themes.colors.branco,
        fontSize: 15,
    },
    endPage: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 30,
    },



    // Estilos TabArea
    tabArea: {
        flexDirection: "row",
        height: 80,
        justifyContent: "space-around",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.29,
        shadowRadius: 4.65,
        elevation: 70
    },
    tabItem: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },



    // Estilos para a página de dashboard
    screenDB: {
    flex: 1,
    backgroundColor: themes.colors.cinzaBg,
    },
    contentDB: {
      padding: 30,
    },
    centeredDB: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    cardDB: {
      marginTop: 30,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: themes.colors.verde,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    heroImageDB: {
      height: 170,
      justifyContent: 'flex-end',
    },
    heroImageRadiusDB: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    badgeDB: {
      alignSelf: 'center',
      backgroundColor: themes.colors.verdeClaro,
      paddingHorizontal: 24,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: -25,
    },
    badgeTextDB: {
      color: themes.colors.branco,
      fontSize: 28,
      fontStyle: 'italic',
      fontWeight: '600',
    },
    pricesPanelDB: {
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 24,
    },
    priceRowDB: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    commodityNameDB: {
      color: themes.colors.branco,
      fontSize: 15,
      opacity: 0.9,
    },
    commodityPriceDB: {
      color: themes.colors.branco,
      fontSize: 34,
      fontWeight: 'bold',
      marginTop: 4,
    },
    commodityDescriptionDB: {
      color: themes.colors.branco,
      fontSize: 13,
      fontStyle: 'italic',
      opacity: 0.85,
      marginTop: 4,
      textAlign: 'center',
    },
    dividerDB: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginVertical: 8,
    },
    updatedAtDB: {
      color: themes.colors.branco,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 12,
      opacity: 0.9,
    },
    footnoteDB: {
      color: themes.colors.branco,
      fontSize: 11,
      textAlign: 'center',
      opacity: 0.75,
      marginTop: 2,
    },
    footerLogoDB: {
      width: 90,
      height: 50,
      alignSelf: 'center',
      marginTop: 12,
    },
    errorBoxDB: {
      backgroundColor: themes.colors.erroBg,
      borderRadius: 12,
      padding: 16,
    },
    errorTextDB: {
      color: themes.colors.erro,
    },
    emptyTextDB: {
      color: themes.colors.branco,
      textAlign: 'center',
      paddingVertical: 20,
    },
    


    //Estilos página de relatórios
    screenRel: {
    flex: 1,
    backgroundColor: themes.colors.branco,
    },
    contentRel: {
      padding: 20,
      paddingBottom: 40,
    },
    titleRowRel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titleRel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themes.colors.verde,
    },
    resumoRowRel: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    resumoCardRel: {
      flex: 1,
      backgroundColor: themes.colors.cinzaBg,
      borderRadius: 10,
      padding: 12,
    },
    resumoLabelRel: {
      fontSize: 12,
      color: themes.colors.cinzaTexto,
      marginBottom: 6,
    },
    resumoValueRel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: themes.colors.preto,
    },
    resumoUnidadeRel: {
      fontSize: 12,
      fontWeight: '400',
      color: themes.colors.cinzaTexto,
    },
    filterBarRel: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: themes.colors.verde,
      borderRadius: 10,
      padding: 8,
      marginBottom: 16,
    },
    dateFieldRel: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: themes.colors.branco,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    dateInputRel: {
      flex: 1,
      color: themes.colors.preto,
      fontSize: 14,
      paddingVertical: 10,
    },
    centeredRel: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    cargaRowRel: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themes.colors.cinzaBg,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
      gap: 8,
    },
    checkboxRel: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: themes.colors.cinzaMedio,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelectedRel: {
      backgroundColor: themes.colors.verdeMedio,
      borderColor: themes.colors.verdeMedio,
    },
    cargaCellRel: {
      fontSize: 13,
      color: themes.colors.preto,
      flex: 1,
    },
    cargaCellDataRel: {
      flex: 1.1,
    },
    cargaCellCulturaRel: {
      flex: 0.9,
    },
    cargaCellSacasRel: {
      flex: 1,
    },
    cargaCellPlacaRel: {
      flex: 1,
      textAlign: 'right',
    },
    pdfButtonRel: {
      backgroundColor: themes.colors.cinzaBg,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    pdfButtonDisabledRel: {
      opacity: 0.5,
    },
    pdfButtonTextRel: {
      color: themes.colors.preto,
      fontWeight: '600',
      fontSize: 14,
    },
    errorBoxRel: {
      backgroundColor: themes.colors.erroBg,
      borderRadius: 12,
      padding: 16,
    },
    errorTextRel: {
      color: themes.colors.erro,
    },
    emptyBoxRel: {
      padding: 24,
      alignItems: 'center',
    },
    emptyTextRel: {
      color: themes.colors.cinzaMedio,
    },



    //Estilos página de contranotas
    screenCN: {
    flex: 1,
    backgroundColor: themes.colors.branco,
    },
    contentCN: {
      padding: 20,
      paddingBottom: 40,
    },
    titleCN: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themes.colors.verde,
      marginBottom: 16,
    },
    centeredCN: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    cardCN: {
      backgroundColor: themes.colors.cinzaBg,
      borderRadius: 12,
      paddingVertical: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitleCN: {
      fontSize: 18,
      fontWeight: '600',
      color: themes.colors.preto,
    },
    cardDateCN: {
      fontSize: 14,
      color: themes.colors.cinzaTexto,
      marginTop: 4,
      marginBottom: 12,
    },
    downloadButtonCN: {
      borderWidth: 1.5,
      borderColor: themes.colors.verdeMedio,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 20,
    },
    downloadButtonTextCN: {
      color: themes.colors.verdeMedio,
      fontWeight: '600',
    },
    errorBoxCN: {
      backgroundColor: themes.colors.erroBg,
      borderRadius: 12,
      padding: 16,
    },
    errorTextCN: {
      color: themes.colors.erro,
    },
    emptyBoxCN: {
      padding: 24,
      alignItems: 'center',
    },
    emptyTextCN: {
      color: themes.colors.cinzaMedio,
    },



    //Estilos página de usuario
    containerPerfil: {
      flex: 100, 
      justifyContent: "center", 
      alignItems: "center", 
      gap: 16
      
    },
    bottomLogout: { 
      backgroundColor: '#c0392b', 
      paddingVertical: 10, 
      paddingHorizontal: 24, 
      borderRadius: 8 
    },    
})

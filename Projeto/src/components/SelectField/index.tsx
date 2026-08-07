import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themes } from '../../global/themes';
import { style } from '../../global/styles'; // Importa os estilos do arquivo styles.ts para estilizar o componente SelectField

export type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
};

// Componente de campo de seleção, exibindo uma lista de opções para o usuário escolher.
export default function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <>
      <TouchableOpacity style={style.fieldSF} onPress={() => setIsOpen(true)}>
        <Text style={style.fieldTextSF} numberOfLines={1}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={themes.colors.cinzaTexto} />
      </TouchableOpacity>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={style.backdropSF} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={style.sheetSF}>
            <Text style={style.sheetTitleSF}>{label}</Text>
            <FlatList
              // Renderiza a lista de opções disponíveis para seleção, permitindo que o usuário escolha uma delas.
              data={options}
              keyExtractor={(item, index) => (item.value ? String(item.value) : `option-${index}`)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={style.optionSF}
                  onPress={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      style.optionTextSF,
                      item.value === value && style.optionTextSelectedSF,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={18} color={themes.colors.verdeMedio} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

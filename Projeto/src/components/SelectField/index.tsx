import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themes } from '../../global/themes';

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

// Não tem nenhuma lib de picker instalada no projeto ainda, então isso é
// um dropdown simples baseado em Modal — dá pra trocar por uma lib
// (ex: @react-native-picker/picker) depois, sem mudar quem usa esse componente.
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
      <TouchableOpacity style={styles.field} onPress={() => setIsOpen(true)}>
        <Text style={styles.fieldText} numberOfLines={1}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={themes.colors.cinzaTexto} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              // Fallback pro índice se algum item vier com value vazio/undefined
              // (dado incompleto vindo da API) — sem isso, o FlatList quebra
              // silenciosamente com "Each child should have a unique key".
              keyExtractor={(item, index) => (item.value ? String(item.value) : `option-${index}`)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
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

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themes.colors.branco,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 90,
  },
  fieldText: {
    color: themes.colors.preto,
    fontSize: 14,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themes.colors.branco,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themes.colors.cinzaMedio,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: themes.colors.cinzaBorda,
  },
  optionText: {
    fontSize: 16,
    color: themes.colors.preto,
  },
  optionTextSelected: {
    color: themes.colors.verdeMedio,
    fontWeight: '600',
  },
});
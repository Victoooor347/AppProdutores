import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { themes } from '../../global/themes';
import { formatDate } from '../../utils/format';
import { buildMarkedDates } from '../../utils/daterange';

type Range = {
  dataInicio?: string; // ISO "AAAA-MM-DD"
  dataFim?: string;
};

type Props = {
  value: Range;
  onChange: (range: Range) => void;
};

export default function DateRangeField({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // Estado temporário enquanto o usuário ainda está escolhendo no calendário
  // — só vira o filtro de verdade quando aperta "Aplicar".
  const [rascunho, setRascunho] = useState<Range>(value);

  function abrir() {
    setRascunho(value);
    setIsOpen(true);
  }

  function handleDayPress(day: DateData) {
    const { dataInicio, dataFim } = rascunho;

    // Sem seleção ainda, ou já tinha um período completo: começa de novo.
    if (!dataInicio || (dataInicio && dataFim)) {
      setRascunho({ dataInicio: day.dateString, dataFim: undefined });
      return;
    }

    // Já tem início, esse toque define o fim (invertendo se clicou num dia anterior).
    if (day.dateString < dataInicio) {
      setRascunho({ dataInicio: day.dateString, dataFim });
      return;
    }

    setRascunho({ dataInicio, dataFim: day.dateString });
  }

  function aplicar() {
    onChange(rascunho);
    setIsOpen(false);
  }

  function limpar() {
    setRascunho({});
    onChange({});
    setIsOpen(false);
  }

  const label =
    value.dataInicio && value.dataFim
      ? `${formatDate(value.dataInicio)} - ${formatDate(value.dataFim)}`
      : value.dataInicio
        ? `A partir de ${formatDate(value.dataInicio)}`
        : 'Data';

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={abrir}>
        <Text style={styles.fieldText} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={themes.colors.cinzaTexto} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.sheetTitle}>Selecione o período</Text>
            <Text style={styles.sheetSubtitle}>
              Toque no dia inicial e depois no dia final
            </Text>

            <Calendar
              markingType="period"
              markedDates={buildMarkedDates(
                rascunho.dataInicio,
                rascunho.dataFim,
                themes.colors.verdeMedio
              )}
              onDayPress={handleDayPress}
              theme={{
                todayTextColor: themes.colors.verdeMedio,
                arrowColor: themes.colors.verdeMedio,
              }}
            />

            <View style={styles.actions}>
              <TouchableOpacity style={styles.clearButton} onPress={limpar}>
                <Text style={styles.clearButtonText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, !rascunho.dataInicio && styles.applyButtonDisabled]}
                disabled={!rascunho.dataInicio}
                onPress={aplicar}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themes.colors.branco,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldText: {
    color: themes.colors.preto,
    fontSize: 13,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: themes.colors.branco,
    borderRadius: 16,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themes.colors.preto,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: themes.colors.cinzaTexto,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: themes.colors.cinzaTexto,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: themes.colors.verdeMedio,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: themes.colors.branco,
    fontWeight: '700',
  },
});
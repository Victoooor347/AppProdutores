import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { themes } from '../../global/themes';
import { formatDate } from '../../utils/format';
import { buildMarkedDates } from '../../utils/daterange';
import { style } from '../../global/styles';

type Range = {
  dataInicio?: string; // ISO "AAAA-MM-DD"
  dataFim?: string;
};

type Props = {
  value: Range;
  onChange: (range: Range) => void;
};

// Componente de campo de seleção de período, exibindo um calendário para o usuário escolher a data inicial e final.
export default function DateRangeField({ value, onChange }: Props) {
  // Estado local para controlar se o modal do calendário está aberto ou fechado
  const [isOpen, setIsOpen] = useState(false);
  // Estado local para armazenar o período selecionado temporariamente enquanto o modal está aberto
  const [rascunho, setRascunho] = useState<Range>(value);

  // Abre o modal do calendário e inicializa o rascunho com o valor atual do campo
  function abrir() {
    setRascunho(value);
    setIsOpen(true);
  }

  //
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

  // Aplica o período selecionado e fecha o modal
  function aplicar() {
    onChange(rascunho);
    setIsOpen(false);
  }

  // Limpa o período selecionado e fecha o modal
  function limpar() {
    setRascunho({});
    onChange({});
    setIsOpen(false);
  }

  // Determina o texto exibido no campo com base no período selecionado
  const label =
    value.dataInicio && value.dataFim
      ? `${formatDate(value.dataInicio)} - ${formatDate(value.dataFim)}`
      : value.dataInicio
        ? `A partir de ${formatDate(value.dataInicio)}`
        : 'Data';

  return (
    <>
      <TouchableOpacity style={style.fieldCal} onPress={abrir}>
        <Text style={style.fieldTextCal} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={themes.colors.cinzaTexto} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={style.backdropCal}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={style.sheetCal}>
            <Text style={style.sheetTitleCal}>Selecione o período</Text>
            <Text style={style.sheetSubtitleCal}>Toque no dia inicial e depois no dia final</Text>

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

            <View style={style.actionsCal}>
              <TouchableOpacity style={style.clearButtonCal} onPress={limpar}>
                <Text style={style.clearButtonTextCal}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[style.applyButtonCal, !rascunho.dataInicio && style.applyButtonDisabledCal]}
                disabled={!rascunho.dataInicio}
                onPress={aplicar}
              >
                <Text style={style.applyButtonTextCal}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

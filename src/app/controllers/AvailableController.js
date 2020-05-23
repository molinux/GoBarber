import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  format,
  isAfter,
} from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';

class AvailableController {
  async index(req, res) {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    // parseInt ou Number funcionam
    const searchDate = Number(date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.params.providerId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
        },
      },
    });

    // horarios disponiveis
    const schedule = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
    ];

    // Percorrer o schedule e transformar cada item em time (variavel)
    const available = schedule.map((time) => {
      // 09:00 -> split = 09 hour, 00 -> minute
      const [hour, minute] = time.split(':');
      // Transformando em: 2020-05-20 09:00:00
      const value = setSeconds(
        setMinutes(setHours(searchDate, hour), minute),
        0
      );

      return {
        time,
        // 2020-05-22T00:00:00-03:00
        value: format(value, "yyyy-MM-dd'T'HH:MM:ssxxx"),
        // Verificar se o horario ja passou ou se esta disponivel
        available:
          isAfter(value, new Date()) &&
          !appointments.find((a) => format(a.date, 'HH:mm') === time),
      };
    });

    return res.json(available);
  }
}

export default new AvailableController();

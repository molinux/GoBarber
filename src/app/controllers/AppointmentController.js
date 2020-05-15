import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import User from '../models/User';
import Appointment from '../models/Appointment';

class AppointmentController {
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    // Checar se o provider_id e um provider
    const checkIsProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!checkIsProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }

    // startOfHour = Coloca hora inteira. Zera minutos e segundos
    const hourStart = startOfHour(parseISO(date));

    // Checar se nao esta tentando marcar antes da hora atual
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past date are not permitted.' });
    }

    // Verificar se a data está disponivel
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    // Depois das verificações, criar o agendamento
    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      // hourStart só permite hora cheia
      date: hourStart,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
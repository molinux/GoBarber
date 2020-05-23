import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    // Se não for informado, por padrão define como page 1
    const { page = 1 } = req.query;

    const appointments = await Appointment.finddAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      // 20 registros por vez (paginacao)
      limit: 20,
      // Quantos registros quer pular
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    // Checar se o provider_id é um provider (provider = true)
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

    // Notificar prestador de serviço
    const user = await User.findByPk(req.userId);
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  // TODO: Está dando erro ao tentar cancelar passando um id inexistente
  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    // Só pode deletar se for o owner do agendamento
    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment.",
      });
    }

    // So pode cancelar com 2hs de antecedência
    const dateWithSub = subHours(appointment.date, 2);

    // De for antes da data (e hora) atual
    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance.',
      });
    }

    // Definindo a data do cancelamento para a data atual
    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();

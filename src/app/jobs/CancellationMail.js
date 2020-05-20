import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class CancellationMail {
  // Com o get, consegue usar:
  // import CancellationMail from '..'
  // CancellationMail.key()
  get key() {
    return 'CancellationMail';
  }

  // Quando o processo executar, executa o handle
  // o handle é chamado para cada envio de email
  // dentro do "data" estão todas as infos para envio de email
  async handle({ data }) {
    const { appointment } = data;

    console.log('A fila executou');

    await Mail.sendMail({
      // Envio para o prestador de serviço
      to: `${appointment.provider.email} <${appointment.provider.email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          parseISO(appointment.date),
          "'dia' dd 'de' MMMM', às' H:mm'h'",
          {
            locale: pt,
          }
        ),
      },
    });
  }
}

export default new CancellationMail();

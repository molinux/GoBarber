import Bee from 'bee-queue';
import CancellationMail from '../app/jobs/CancellationMail';
import redisConfig from '../config/redis';

const jobs = [CancellationMail];

class Queue {
  constructor() {
    // Uma fila para cada background
    // Ex.: fila para aviso de cancelamento, fila de recuperação de senha, etc.
    this.queues = {};

    this.init();
  }

  init() {
    jobs.forEach(({ key, handle }) => {
      this.queues[key] = {
        bee: new Bee(key, {
          redis: redisConfig,
        }),
        // Para cada job recebido, executa o handle
        // (que está no CancellationMail.js)
        handle,
      };
    });
  }

  // Método que adiciona novos jobs dentro de cada fila
  // queue = a qual fila quer adicionar o job
  add(queue, job) {
    // queues[queue] - Das filas, seleciona a fila especifica
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    jobs.forEach((job) => {
      const { bee, handle } = this.queues[job.key];

      /*
      Monitorar possiveis falhas na fila
      Mais estados de monitoramento em:
      https://github.com/bee-queue/bee-queue#benchmarks
      */
      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    console.log(`Queue ${job.queue.name}: FAILED`, err);
  }
}

export default new Queue();

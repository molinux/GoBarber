import Sequelize, { Model } from 'sequelize';
import bcrypt from 'bcryptjs';

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        email: Sequelize.STRING,
        // VIRTUAL = nunca vai existir na base
        password: Sequelize.VIRTUAL,
        password_hash: Sequelize.STRING,
        provider: Sequelize.BOOLEAN,
      },
      {
        sequelize,
      }
    );
    // Antes que qualquer usuario criado, vai executar o hook
    this.addHook('beforeSave', async (user) => {
      if (user.password) {
        // 8 = nivel de criptografia
        user.password_hash = await bcrypt.hash(user.password, 8);
      }
    });

    return this;
  }

  // Criar o relacionamento para o arquivo de avatar
  static associate(models) {
    this.belongsTo(models.File, { foreignKey: 'avatar_id', as: 'avatar' });
  }

  // Verificar se a senha para se logar está correta
  checkPassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

export default User;

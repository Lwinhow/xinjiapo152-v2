<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">DE152 Dashboard</div>
      <div class="login-sub">Please log in to access</div>
      <el-form ref="form" :model="form" :rules="rules" @submit.native.prevent="submit">
        <el-form-item prop="username">
          <el-input v-model="form.username" prefix-icon="el-icon-user"
                    placeholder="username" @keyup.enter.native="submit"/>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" show-password
                    prefix-icon="el-icon-lock" placeholder="password" @keyup.enter.native="submit"/>
        </el-form-item>
        <el-form-item>
          <el-button class="login-btn" type="primary" @click="submit">submit</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import {login} from '@/utils/auth'

export default {
  name: 'LoginPage',
  data() {
    return {
      form: {username: '', password: ''},
      rules: {
        username: [{required: true, message: 'Please enter your username', trigger: 'blur'}],
        password: [{required: true, message: 'Please enter the password', trigger: 'blur'}]
      }
    }
  },
  methods: {
    submit() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (login(this.form.username.trim(), this.form.password)) {
          this.$router.replace(this.$route.query.redirect || '/')
        } else {
          this.$message.error('Incorrect username or password')
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(1200px 800px at 50% 18%, rgba(10, 60, 110, 0.9), rgba(3, 22, 44, 0.98) 65%),
    #041e3a;
}

.login-card {
  width: 360px;
  padding: 40px 36px 24px;
  border-radius: 8px;
  border: 1px solid rgba(63, 210, 255, 0.35);
  background: linear-gradient(180deg, rgba(10, 60, 110, 0.85), rgba(6, 34, 66, 0.85));
  box-shadow: 0 0 40px rgba(0, 213, 255, 0.15);
}

.login-title {
  text-align: center;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #eaf7ff;
}

.login-sub {
  margin: 10px 0 28px;
  text-align: center;
  font-size: 13px;
  letter-spacing: 2px;
  color: #8fc6ea;
}

.login-btn {
  width: 100%;
  border: none;
  color: #fff;
  background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
}

::v-deep .el-input__inner {
  color: #eaf7ff;
  border-color: rgba(63, 210, 255, 0.35);
  background: rgba(4, 34, 64, 0.97);

  &:focus {
    border-color: #3fd2ff;
  }

  &::placeholder {
    color: #6fb7e2;
  }
}

::v-deep .el-input__prefix,
::v-deep .el-input__suffix {
  color: #6fb7e2;
}
</style>

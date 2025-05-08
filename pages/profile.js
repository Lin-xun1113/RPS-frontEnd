import React from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import ProfilePage from '../components/ProfilePage';

const Profile = () => {
  return (
    <Layout>
      <Head>
        <title>个人账户 | 石头剪刀布游戏</title>
        <meta name="description" content="查看您的账户信息和游戏奖励" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <ProfilePage />
    </Layout>
  );
};

export default Profile;

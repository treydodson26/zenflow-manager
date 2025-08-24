import React from 'react';
import { Helmet } from 'react-helmet-async';
import EnhancedSequenceBuilder from '@/components/sequences/EnhancedSequenceBuilder';

const SequenceBuilderPage = () => {
  return (
    <>
      <Helmet>
        <title>Sequence Builder | Talo Yoga</title>
        <meta 
          name="description" 
          content="Build automated customer communication sequences with email and WhatsApp integration. Create Apollo.io-style nurture campaigns." 
        />
        <meta 
          name="keywords" 
          content="customer communication, email sequences, WhatsApp automation, marketing automation, yoga studio management" 
        />
      </Helmet>
      <EnhancedSequenceBuilder />
    </>
  );
};

export default SequenceBuilderPage;
import type { Schema, Struct } from '@strapi/strapi';

export interface DestinationLocation extends Struct.ComponentSchema {
  collectionName: 'components_destination_locations';
  info: {
    displayName: 'location';
    icon: 'pinMap';
  };
  attributes: {
    latitude: Schema.Attribute.Decimal & Schema.Attribute.Required;
    longitude: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'destination.location': DestinationLocation;
    }
  }
}

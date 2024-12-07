/**
 * destination controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::destination.destination', ({strapi}) => ({
    async findOne(ctx) {
        const { id } = ctx.params;
        const entity = await strapi.db.query('api::destination.destination').findOne({
            where: { urlSlug: id },
            populate: ['titlePicture', 'places', 'places.pictures.image', 'places.details']
        });
        const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

        return this.transformResponse(sanitizedEntity);
    }
}));

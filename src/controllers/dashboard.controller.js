import DeliveryNote from '../models/DeliveryNote.js';

export const getDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.company;

    const [byMonth, hoursByProject, materialsByClient] = await Promise.all([
      DeliveryNote.aggregate([
        { $match: { company: companyId, deleted: false } },
        {
          $group: {
            _id: {
              year: { $year: '$workDate' },
              month: { $month: '$workDate' },
            },
            total: { $sum: 1 },
            signed: { $sum: { $cond: ['$signed', 1, 0] } },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
      DeliveryNote.aggregate([
        { $match: { company: companyId, format: 'hours', deleted: false } },
        {
          $group: {
            _id: '$project',
            totalHours: {
              $sum: {
                $add: [
                  { $ifNull: ['$hours', 0] },
                  {
                    $sum: {
                      $map: {
                        input: { $ifNull: ['$workers', []] },
                        as: 'w',
                        in: '$$w.hours',
                      },
                    },
                  },
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project',
          },
        },
        { $unwind: '$project' },
        {
          $project: {
            _id: 0,
            project: { _id: '$project._id', name: '$project.name', code: '$project.projectCode' },
            totalHours: 1,
            count: 1,
          },
        },
        { $sort: { totalHours: -1 } },
      ]),
      DeliveryNote.aggregate([
        { $match: { company: companyId, format: 'material', deleted: false } },
        {
          $group: {
            _id: { client: '$client', material: '$material', unit: '$unit' },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'clients',
            localField: '_id.client',
            foreignField: '_id',
            as: 'client',
          },
        },
        { $unwind: '$client' },
        {
          $project: {
            _id: 0,
            client: { _id: '$client._id', name: '$client.name' },
            material: '$_id.material',
            unit: '$_id.unit',
            totalQuantity: 1,
            count: 1,
          },
        },
        { $sort: { totalQuantity: -1 } },
      ]),
    ]);

    res.json({ byMonth, hoursByProject, materialsByClient });
  } catch (err) {
    next(err);
  }
};
